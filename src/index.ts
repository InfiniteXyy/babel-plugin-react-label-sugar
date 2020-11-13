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
import { Scope } from "@babel/traverse";
import { capitalize } from "./utils";

const DefaultRefLabel = "ref";
const DefaultRefFactory = "React.useState";
const DefaultIgnoreMemberExpr = true;

type PluginOptions = { refLabel?: string; refFactory?: string; ignoreMemberExpr?: boolean };
type ReactRefItem = { identify: Identifier; modifier: Identifier; scope: Scope };
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
        const { node, scope } = path;
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
          scope,
          identify: left,
          modifier: scope.generateUidIdentifier(`set${capitalize(left.name)}`),
        };

        path.replaceWith(
          variableDeclaration("const", [
            variableDeclarator(
              arrayPattern([refItem.identify, refItem.modifier]),
              callExpression(identifier(refFactory), [right])
            ),
          ])
        );
        state.reactRefs ??= [];
        state.reactRefs.push(refItem);
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

/**
 * Get target value from "Identifier" or "MemberExpression"
 * eg: a = 1;          =>  a
 * eg: obj.value = 1;  =>  obj
 */
function getTargetRef(leftValue: object | null | undefined, refs: ReactRefs): ReactRefItem | undefined {
  if (!isIdentifier(leftValue) && !isMemberExpression(leftValue)) return undefined;
  if (isIdentifier(leftValue)) {
    const target = leftValue.name;
    return refs.find((ref) => ref.identify.name === target);
  } else {
    return getTargetRef(leftValue.object, refs);
  }
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

/**
 * check if ref binding has be override in current scope
 * check if ref is not included in current scope
 */
function isRefInTargetScope(scope: Scope | undefined, ref: ReactRefItem): boolean {
  if (!scope) return false;

  if (scope === ref.scope) return true;
  // if has overwritten ref in the path, return false;
  if (scope.bindings[ref.identify.name]) return false;

  return isRefInTargetScope(scope.parent, ref);
}

export default reactLabelSugar;
