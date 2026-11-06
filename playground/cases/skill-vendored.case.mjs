import { bad, ok, resultText } from "./_shared.mjs";

function findCall(calls, tool, name) {
  return calls.find((call) => call.tool === tool && call.input?.name === name);
}

export default {
  id: "CASE-SKILL-VENDORED-01",
  title: "可见和隐藏的 vendored 技能加载",
  build() {
    return {
      prompt: [
        "请做一次随包 vendored 技能加载自检，不要执行技能正文里的任务，也不要修改文件。",
        "先用 `skill` 加载可见的 vendored 技能 `deslop`。",
        "再用 `pstack_skill` 加载隐藏的 vendored 技能 `retro`。",
        "最后用一句话报告两次调用是否成功。",
      ].join("\n"),
      verify({ calls }) {
        const visible = findCall(calls, "skill", "deslop");
        const hidden = findCall(calls, "pstack_skill", "retro");
        if (visible === undefined) return bad("没有找到 skill(deslop) 调用");
        if (hidden === undefined) return bad("没有找到 pstack_skill(retro) 调用");
        if (!resultText(visible).includes("Remove AI code slop")) {
          return bad(`deslop 正文未返回：${resultText(visible).slice(0, 200)}`);
        }
        if (!resultText(hidden).includes('<skill_content name="retro"')) {
          return bad(`retro 正文未返回：${resultText(hidden).slice(0, 200)}`);
        }
        return ok("可见 deslop 与隐藏 retro 均成功加载");
      },
    };
  },
};
