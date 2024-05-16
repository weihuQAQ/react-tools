import _ from "lodash";
import { NormalProduct, NormalProductSku } from "../types/product";

// Add more comparison operators if needed
type Operators = "eq" | "not" | "has" | "in" | "between";

type ComparisonCondition = {
  [key: string]: {
    [key in Operators]?: unknown;
  };
};

export type Condition = {
  and?: (ComparisonCondition | Condition)[];
  or?: (ComparisonCondition | Condition)[];
};

type OriginCondition = {
  and?: OriginCondition;
  or?: OriginCondition;
} & ComparisonCondition;

function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

/**
 * execution operator.
 * @param options
 */
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
    case "has":
      if (!Array.isArray(entryValue)) return false;
      if (!entryValue.includes(conditionValue)) return false;
      break;
    case "in":
      if (!Array.isArray(conditionValue)) return false;
      if (!conditionValue.includes(entryValue)) return false;
      break;
    case "between":
      if (!_.isObject(conditionValue) || !_.isNumber(entryValue)) return false;
      if ("min" in conditionValue && _.isNumber(conditionValue.min)) {
        if (entryValue < conditionValue.min) return false;
      }
      if ("max" in conditionValue && _.isNumber(conditionValue.max)) {
        if (entryValue > conditionValue.max) return false;
      }
      break;
    // Add more cases for other operators if needed
    default:
      // Check if switch case is missing assertions
      return assertNever(operator);
  }
  return true;
};

/**
 * Execute all operators, generally only one.
 * @param options
 */
const processComparison = <V>(options: {
  entity: Record<string, V>;
  condition: ComparisonCondition;
}) => {
  const { entity, condition } = options;

  const key = Object.keys(condition)[0];
  const conditionValues = condition[key];
  const operators = Object.keys(conditionValues) as Operators[];

  return operators.every((operator) => {
    const conditionValue = conditionValues[operator];
    return processOperator({
      operator,
      conditionValue,
      entryValue: _.get(entity, key),
    });
  });
};

/**
 * Determine whether the entity meets the conditions (normal conditions).
 * @param entity
 * @param conditions
 */
export const satisfiesConditions = <V>(
  entity: Record<string, V>,
  conditions: Condition[] = []
) => {
  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];

    if ("and" in condition) {
      if (!satisfiesConditions(entity, condition.and)) {
        return false;
      }
    } else if ("or" in condition) {
      const orResult = condition.or?.some((v) =>
        satisfiesConditions(entity, [v])
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

export const mergeEntity = (
  product: NormalProduct,
  sku: NormalProductSku
): NormalProduct & { sku: NormalProductSku } => {
  return {
    ...product,
    sku,
  };
};

/**
 * Convert original conditions to normal conditions
 * @param origin
 */
export const normalizeOriginCondition = (
  origin: OriginCondition
): Condition[] => {
  if (!_.isObject(origin)) return [];

  const process = (originCondition: OriginCondition): Condition[] => {
    const keys = Object.keys(originCondition);

    return keys.map((key) => {
      if (key === "and" || key === "or") {
        const subCondition = originCondition[key] ?? {};
        return { [key]: process(subCondition) };
      } else {
        return {
          [key]: originCondition[key],
        };
      }
    });
  };

  return [{ and: process(origin) }];
};
