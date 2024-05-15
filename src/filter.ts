import _ from "lodash";

// Add more comparison operators if needed
type Operators = "eq" | 'not' | 'ge' | 'gt' | 'lte' | 'lt'

type ComparisonCondition = {
  [key: string]: {
    [key in Operators]?: unknown;
  };
};

export type Condition = {
  and?: (ComparisonCondition | Condition)[];
  or?: (ComparisonCondition | Condition)[];
};

const getValue = <T extends Record<string, unknown>>(
  product: T,
  sku: T,
  key: string,
) => {
  if (key.startsWith("sku.")) {
    return _.get({ sku }, key);
  }
  return _.get(product, key);
};

function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

const processOperator = <V>(options: {
  operator: Operators;
  entryValue: V;
  conditionValue: V;
}) => {
  const { operator, entryValue, conditionValue } = options;
  switch (operator) {
    case "eq":
      if (entryValue !== conditionValue) return false;
      break;
    case "not":
      if (entryValue === conditionValue) return false;
      break;
    case "ge":
      if (entryValue < conditionValue) return false;
      break;
    case "gt":
      if (entryValue <= conditionValue) return false;
      break;
    case "lte":
      if (entryValue > conditionValue) return false;
      break;
    case "lt":
      if (entryValue >= conditionValue) return false;
      break;
    // Add more cases for other operators if needed
    default:
      return assertNever(operator);
  }
  return true;
};

const processComparison = <V>(options: {
  entity: Record<string, V>;
  condition: ComparisonCondition;
}) => {
  const { entity, condition } = options;

  const key = Object.keys(condition)[0];
  const conditionValues = condition[key];
  const operators = Object.keys(
    conditionValues,
  ) as Operators[];

  return operators.every((operator) => {
    const conditionValue = conditionValues[operator];
    // FIXME
    const sku = {};
    return processOperator({
      operator,
      conditionValue,
      entryValue: getValue(entity, sku, key),
    });
  });
};

export const satisfiesConditions = <V>(
  entity: Record<string, V>,
  conditions: Condition[] = [],
) => {
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];

    if ("and" in condition) {
      if (!satisfiesConditions(entity, condition.and)) {
        return false;
      }
    } else if ("or" in condition) {
      const orResult = condition.or?.some((v) =>
        satisfiesConditions(entity, [v]),
      );

      if (!orResult) return false;
    } else {
      const valid = processComparison({
        entity,
        condition: condition as ComparisonCondition,
      });

      if (!valid) return false;
    }
  }

  return true;
};
