import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-migrate-callers-then-delete-legacy-apis",
  skill: "principle-migrate-callers-then-delete-legacy-apis",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt: "我想给数据访问层换个新的查询接口，老的先留着做兼容，用一段时间慢慢把调用方迁过去。",
  workspaceFiles: {
    "src/db/query.ts": `export function queryOld(table: string, where: object) {
  // 旧接口
}

export function queryNew(table: string, options: QueryOptions) {
  // 新接口
}`,
    "src/users.ts": `import { queryOld } from "./db/query";
export const users = queryOld("users", { active: true });`,
    "src/orders.ts": `import { queryOld } from "./db/query";
export const orders = queryOld("orders", { paid: true });`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-migrate-callers-then-delete-legacy-apis" },
  ],
  intent:
    "在没有外部兼容需求时，正确做法是同一波里迁完调用方并删除旧 API，而不是保留会长期存在的兼容层。",
};
