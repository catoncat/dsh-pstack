export default {
  id: "CASE-PRESET-01",
  title: "agent preset 挂载（headless 不支持，需 web 会话）",
  build() {
    return {
      skip: "headless profile 缺 agentPresets 服务，preset 用例需在 17353 web 会话跑（见 playground/README.md）",
    };
  },
};
