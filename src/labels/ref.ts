import {
  arrayPattern,
  callExpression,
  Expression,
  identifier,
  isAssignmentExpression,
  isIdentifier,
  variableDeclaration,
  variableDeclarator,
} from "@babel/types";
import { Node } from "@babel/core";
import { Scope } from "@babel/traverse";
import { PluginOptions, ReactRefItem } from "../types";
import { capitalize } from "../utils";
import { DefaultStateFactory } from "../constant";

export default function handleRefLabel(
  expression: Expression,
  scope: Scope,
  options: PluginOptions,
  onSuccess: (newBody: Node, ref: ReactRefItem) => void
) {
  const { stateFactory = DefaultStateFactory } = options;

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

  onSuccess(
    variableDeclaration("const", [
      variableDeclarator(
        arrayPattern([refItem.identify, refItem.modifier]),
        callExpression(identifier(stateFactory), [right])
      ),
    ]),
    refItem
  );
}
