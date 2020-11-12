import { NodePath, PluginItem } from "@babel/core";
import {
  arrayPattern,
  arrowFunctionExpression,
  binaryExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  identifier,
  Identifier,
  isAssignmentExpression,
  isExpressionStatement,
  isIdentifier,
  isMemberExpression,
  MemberExpression,
  numericLiteral,
  variableDeclaration,
  variableDeclarator,
} from "@babel/types";
import { capitalize } from "./utils";

const DefaultRefLabel = "ref";
const DefaultRefFactory = "React.useState";
const DefaultIgnoreMemberExpr = true;

type PluginOptions = { refLabel?: string; refFactory?: string; ignoreMemberExpr?: boolean };
type ReactRefItem = { identify: Identifier; modifier: Identifier };
type ReactRefs = ReactRefItem[];
type ReactRefsState = { reactRefs?: ReactRefs };

function reactLabelSugar(_: any, options: PluginOptions): PluginItem {
  const {
    refFactory = DefaultRefFactory,
    refLabel = DefaultRefLabel,
    ignoreMemberExpr = DefaultIgnoreMemberExpr,
  } = options;
  return {
    visitor: {
      LabeledStatement: (path, state: ReactRefsState) => {
        const { node } = path;
        const { label, body } = node;
        if (label.name !== refLabel) return;

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
          modifier: path.scope.generateUidIdentifier(`set${capitalize(left.name)}`),
        };

        path.replaceWith(
          variableDeclaration("const", [
            variableDeclarator(
              arrayPattern([refItem.identify, refItem.modifier]),
              callExpression(identifier(refFactory), [right])
            ),
          ])
        );
        if (!state.reactRefs) state.reactRefs = [];
        state.reactRefs.push(refItem);
      },
      AssignmentExpression: (path, state: ReactRefsState) => {
        if (!state.reactRefs) return;
        const { node } = path;
        const ref = getTargetRef(node.left, state.reactRefs);
        if (!ref) return;
        if (isMemberExpression(node.left)) {
          !ignoreMemberExpr && handleMemberExpression(node.left, ref, path);
        } else {
          if (node.operator === "=") {
            path.replaceWith(callExpression(ref.modifier, [node.right]));
          } else {
            path.replaceWith(
              callExpression(ref.modifier, [
                arrowFunctionExpression(
                  [ref.identify],
                  binaryExpression(node.operator.slice(0, -1) as any, ref.identify, node.right)
                ),
              ])
            );
          }
        }
      },
      UpdateExpression: (path, state: ReactRefsState) => {
        if (!state.reactRefs) return;
        const { node } = path;
        const ref = getTargetRef(node.argument, state.reactRefs);
        if (!ref) return;
        if (isMemberExpression(node.argument)) {
          !ignoreMemberExpr && handleMemberExpression(node.argument, ref, path);
        } else {
          path.replaceWith(
            callExpression(ref.modifier, [
              arrowFunctionExpression(
                [ref.identify],
                binaryExpression(node.operator === "++" ? "+" : "-", ref.identify, numericLiteral(1))
              ),
            ])
          );
        }
      },
    },
  };
}

/**
 * Get target value from "Identifier" or "MemberExpression"
 * eg: a = 1;          =>  a
 * eg: obj.value = 1;  =>  obj
 */
function getTargetRef(leftValue: object | null | undefined, refs: ReactRefs): ReactRefItem | undefined {
  if (!isIdentifier(leftValue) && !isMemberExpression(leftValue)) return undefined;
  let target: string;
  if (isIdentifier(leftValue)) {
    target = leftValue.name;
  } else {
    if (!isIdentifier(leftValue.object)) return undefined;
    target = leftValue.object.name;
  }
  return refs.find((ref) => ref.identify.name === target);
}

/**
 * move member expression to setState callback;
 * eg: obj.value = 1;  =>  setState(obj => { obj.value = 1 });
 */
function handleMemberExpression(node: MemberExpression, ref: ReactRefItem, path: NodePath<any>) {
  if (node.extra?.REACT_REF_HAS_SETTED) return;
  path.replaceWith(
    callExpression(ref.modifier, [
      arrowFunctionExpression([ref.identify], blockStatement([expressionStatement(path.node)])),
    ])
  );
  node.extra ??= {};
  node.extra.REACT_REF_HAS_SETTED = true;
}

export default reactLabelSugar;
