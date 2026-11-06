import { bad, ok, resultText } from "./_shared.mjs";

function findSkillCall(calls, name, resource) {
  return calls.find(
    (call) =>
      call.tool === "pstack_skill" &&
      call.input?.name === name &&
      (resource === undefined || call.input?.resource === resource),
  );
}

export default {
  id: "CASE-SKILL-PACKAGED-01",
  title: "随包隐藏 pstack 技能和相对资源可加载",
  build() {
    return {
      prompt: [
        "请做一次随包技能加载自检，不要执行技能正文里的任务，也不要修改文件。",
        "先调用 `pstack_skill`，name 传 `how`，只确认能读取正文。",
        "再调用一次 `pstack_skill`，name 仍传 `how`，resource 传 `references/explainer-prompt.md`，确认能读取相对资源。",
        "最后用一句话报告两次调用是否成功。",
      ].join("\n"),
      verify({ calls }) {
        const body = findSkillCall(calls, "how");
        const resource = findSkillCall(calls, "how", "references/explainer-prompt.md");
        if (body === undefined) return bad("没有找到加载 how 正文的 pstack_skill 调用");
        if (resource === undefined) return bad("没有找到加载 how 相对资源的 pstack_skill 调用");
        if (!resultText(body).includes('<skill_content name="how"')) {
          return bad(`how 正文结果不含 skill_content：${resultText(body).slice(0, 200)}`);
        }
        if (
          !resultText(resource).includes('<skill_resource path="references/explainer-prompt.md"')
        ) {
          return bad(`how 资源结果不含 skill_resource：${resultText(resource).slice(0, 200)}`);
        }
        return ok("pstack 正文和相对资源均成功加载");
      },
    };
  },
};
