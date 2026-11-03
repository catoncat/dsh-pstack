// 新用例模板：复制为 <topic>.case.mjs，glob 会自动注册。
import { ok } from "./_shared.mjs";

export default {
  id: "CASE-<TOPIC>-<NN>",
  title: "<一句话场景>",
  build() {
    return {
      roleLines: [], // 需要的 pstack-models.mdc 行；空数组表示不写角色文件
      prompt: "<发给会话的任务>",
      verify() {
        return ok("在这里校验能力级可观察事实");
      },
    };
  },
};
