import { PluginItem } from "@babel/core";
import {
  arrowFunctionExpression,
  binaryExpression,
  callExpression,
  isExpressionStatement,
  isMemberExpression,
  numericLiteral,
} from "@babel/types";
import { getTargetRef, handleMemberExpression, isRefInTargetScope } from "./utils";
import { PluginOptions, ReactRefsState } from "./types";
import handleRefLabel from "./labels/ref";
import { DefaultIgnoreMemberExpr, DefaultRefLabel, DefaultWatchLabel } from "./constant";
import handleWatchLabel from "./labels/watch";

function reactLabelSugar(_: any, options: PluginOptions): PluginItem {
  const {
    refLabel = DefaultRefLabel,
    watchLabel = DefaultWatchLabel,
    ignoreMemberExpr = DefaultIgnoreMemberExpr,
  } = options;
  return {
    visitor: {
      LabeledStatement: (path, state: ReactRefsState) => {
        const { node, scope } = path;
        const { label, body } = node;
        if (!isExpressionStatement(body)) {
          throw new Error("ref sugar must be an expression statement");
        }
        switch (label.name) {
          case refLabel: {
            handleRefLabel(body.expression, scope, options, (newBody, ref) => {
              path.replaceWith(newBody);
              state.reactRefs ??= [];
              state.reactRefs.push(ref);
            });
            break;
          }
          case watchLabel: {
            handleWatchLabel(body.expression, scope, options, (newBody) => path.replaceWith(newBody));
            break;
          }
          default: {
            break;
          }
        }
      },
      AssignmentExpression: (path, state: ReactRefsState) => {
        if (!state.reactRefs) return;
        const { node, scope } = path;
        const ref = getTargetRef(node.left, state.reactRefs);
        if (!ref || !isRefInTargetScope(scope, ref)) return;
        if (isMemberExpression(node.left)) {
          !ignoreMemberExpr && handleMemberExpression(node.left, ref, path);
        } else {
          const arrowReturn =
            node.operator === "="
              ? node.right
              : binaryExpression(node.operator.slice(0, -1) as any, ref.identify, node.right);
          path.replaceWith(callExpression(ref.modifier, [arrowFunctionExpression([ref.identify], arrowReturn)]));
        }
      },
      UpdateExpression: (path, state: ReactRefsState) => {
        if (!state.reactRefs) return;
        const { node, scope } = path;
        const ref = getTargetRef(node.argument, state.reactRefs);
        if (!ref || !isRefInTargetScope(scope, ref)) return;
        if (isMemberExpression(node.argument)) {
          !ignoreMemberExpr && handleMemberExpression(node.argument, ref, path);
          return;
        }
        path.replaceWith(
          callExpression(ref.modifier, [
            arrowFunctionExpression(
              [ref.identify],
              binaryExpression(node.operator === "++" ? "+" : "-", ref.identify, numericLiteral(1))
            ),
          ])
        );
      },
    },
  };
}

export default reactLabelSugar;
