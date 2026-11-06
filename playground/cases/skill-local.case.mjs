import { bad, ok, resultText } from "./_shared.mjs";

export default {
  id: "CASE-SKILL-LOCAL-01",
  title: "项目 .agents/skills 本地技能可被 skill 加载",
  build() {
    return {
      prompt: [
        "请用 `skill` 工具加载当前项目的本地技能 `decision-write`，只确认读取成功，不要执行其中任务，也不要修改文件。",
        "然后用一句话报告读取结果。",
      ].join("\n"),
      verify({ calls }) {
        const call = calls.find(
          (entry) => entry.tool === "skill" && entry.input?.name === "decision-write",
        );
        if (call === undefined) return bad("没有找到 skill(decision-write) 调用");
        if (!resultText(call).includes("Write or update a decision record")) {
          return bad(`decision-write 正文未返回：${resultText(call).slice(0, 200)}`);
        }
        return ok("项目本地技能 decision-write 成功加载");
      },
    };
  },
};
