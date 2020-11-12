import { PluginItem } from "@babel/core";
import {
  callExpression,
  identifier,
  Identifier,
  arrayPattern,
  variableDeclarator,
  isAssignmentExpression,
  isExpressionStatement,
  isIdentifier,
  variableDeclaration,
} from "@babel/types";
import { capitalize } from "./utils";

const RefLabel = "ref";

type ReactRefItem = { identify: Identifier; modifier: Identifier };
type ReactRefs = ReactRefItem[];
type ReactRefsState = { reactRefs?: ReactRefs };

function reactRefSugar(): PluginItem {
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
          modifier: identifier(`set${capitalize(left.name)}`),
        };

        path.replaceWith(
          variableDeclaration("const", [
            variableDeclarator(
              arrayPattern([refItem.identify, refItem.modifier]),
              callExpression(identifier("useState"), [right])
            ),
          ])
        );
        if (!state.reactRefs) state.reactRefs = [];
        state.reactRefs.push(refItem);
      },
      AssignmentExpression: (path, state: ReactRefsState) => {
        if (!state.reactRefs) return;
        const { node } = path;
        if (isIdentifier(node.left)) {
          const identify = node.left.name;
          const ref = state.reactRefs.find(
            (ref) => ref.identify.name === identify
          );
          if (ref) {
            path.replaceWith(callExpression(ref.modifier, [node.right]));
          }
        }
      },
    },
  };
}

export default reactRefSugar;
