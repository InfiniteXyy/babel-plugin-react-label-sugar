import { PluginItem } from "@babel/core";
import {
  arrayPattern,
  arrowFunctionExpression,
  binaryExpression,
  callExpression,
  identifier,
  Identifier,
  isAssignmentExpression,
  isExpressionStatement,
  isIdentifier,
  numericLiteral,
  variableDeclaration,
  variableDeclarator,
} from "@babel/types";
import { capitalize } from "./utils";

const DefaultRefLabel = "ref";
const DefaultRefFactory = "React.useState";

type PluginOptions = { RefLabel: string; RefFactory: string };
type ReactRefItem = { identify: Identifier; modifier: Identifier };
type ReactRefs = ReactRefItem[];
type ReactRefsState = { reactRefs?: ReactRefs };

function reactLabelSugar(_: any, options: PluginOptions): PluginItem {
  const {
    RefFactory = DefaultRefFactory,
    RefLabel = DefaultRefLabel,
  } = options;
  return {
    visitor: {
      LabeledStatement: (path, state: ReactRefsState) => {
        const { node } = path;
        const { label, body } = node;
        if (label.name !== RefLabel) return;

        if (!isExpressionStatement(body)) {
          throw new Error("ref sugar must be an expression statement");
        }

        const { expression } = body;
        if (!isAssignmentExpression(expression)) {
          throw new Error("ref sugar expression must be an assignment");
        }

        const { left, right } = expression;
        if (!isIdentifier(left)) {
          throw new Error("ref sugar assignment left must be an identifier");
        }

        const refItem: ReactRefItem = {
          identify: left,
          modifier: path.scope.generateUidIdentifier(
            `set${capitalize(left.name)}`
          ),
        };

        path.replaceWith(
          variableDeclaration("const", [
            variableDeclarator(
              arrayPattern([refItem.identify, refItem.modifier]),
              callExpression(identifier(RefFactory), [right])
            ),
          ])
        );
        if (!state.reactRefs) state.reactRefs = [];
        state.reactRefs.push(refItem);
      },
      AssignmentExpression: (path, state: ReactRefsState) => {
        if (!state.reactRefs) return;
        const { node } = path;
        if (!isIdentifier(node.left)) return;
        const identify = node.left.name;
        const ref = state.reactRefs.find(
          (ref) => ref.identify.name === identify
        );
        if (!ref) return;
        if (node.operator === "=") {
          path.replaceWith(callExpression(ref.modifier, [node.right]));
        } else {
          path.replaceWith(
            callExpression(ref.modifier, [
              arrowFunctionExpression(
                [ref.identify],
                binaryExpression(
                  node.operator.slice(0, -1) as any,
                  ref.identify,
                  node.right
                )
              ),
            ])
          );
        }
      },
      UpdateExpression: (path, state: ReactRefsState) => {
        if (!state.reactRefs) return;
        const { node } = path;
        if (!isIdentifier(node.argument)) return;
        const identify = node.argument.name;
        const ref = state.reactRefs.find(
          (ref) => ref.identify.name === identify
        );
        if (!ref) return;
        path.replaceWith(
          callExpression(ref.modifier, [
            arrowFunctionExpression(
              [ref.identify],
              binaryExpression(
                node.operator === "++" ? "+" : "-",
                ref.identify,
                numericLiteral(1)
              )
            ),
          ])
        );
      },
    },
  };
}

export default reactLabelSugar;
