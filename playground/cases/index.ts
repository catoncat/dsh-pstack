import type { SkillCase } from "../types";
import { skillCase as architect } from "./architect";
import { skillCase as arena } from "./arena";
import { skillCase as automateMe } from "./automate-me";
import { skillCase as benchmarkChecklist } from "./benchmark-checklist";
import { skillCase as blastRadius } from "./blast-radius";
import { skillCase as bro } from "./bro";
import { skillCase as correct } from "./correct";
import { skillCase as createFormalVerificationSkill } from "./create-formal-verification-skill";
import { skillCase as createVerificationSkill } from "./create-verification-skill";
import { skillCase as figureItOut } from "./figure-it-out";
import { skillCase as how } from "./how";
import { skillCase as inYourOwnWords } from "./in-your-own-words";
import { skillCase as interrogate } from "./interrogate";
import { skillCase as ketchup } from "./ketchup";
import { skillCase as ketchupVideo } from "./ketchup-video";
import { skillCase as maintainFormalVerificationSkill } from "./maintain-formal-verification-skill";
import { skillCase as maintainVerificationSkill } from "./maintain-verification-skill";
import { skillCase as makeBotUi } from "./make-bot-ui";
import { skillCase as noComments } from "./no-comments";
import { skillCase as potetoHelp } from "./poteto-help";
import { skillCase as potetoMode } from "./poteto-mode";
import { skillCase as principleAttackThePremise } from "./principle-attack-the-premise";
import { skillCase as principleBoundaryDiscipline } from "./principle-boundary-discipline";
import { skillCase as principleBuildTheLever } from "./principle-build-the-lever";
import { skillCase as principleEncodeLessonsInStructure } from "./principle-encode-lessons-in-structure";
import { skillCase as principleExhaustTheDesignSpace } from "./principle-exhaust-the-design-space";
import { skillCase as principleExperienceFirst } from "./principle-experience-first";
import { skillCase as principleExplainTheNumber } from "./principle-explain-the-number";
import { skillCase as principleFixRootCauses } from "./principle-fix-root-causes";
import { skillCase as principleFoundationalThinking } from "./principle-foundational-thinking";
import { skillCase as principleGuardTheContextWindow } from "./principle-guard-the-context-window";
import { skillCase as principleLazinessProtocol } from "./principle-laziness-protocol";
import { skillCase as principleMakeOperationsIdempotent } from "./principle-make-operations-idempotent";
import { skillCase as principleMigrateCallersThenDeleteLegacyApis } from "./principle-migrate-callers-then-delete-legacy-apis";
import { skillCase as principleMinimizeReaderLoad } from "./principle-minimize-reader-load";
import { skillCase as principleModelTheDomain } from "./principle-model-the-domain";
import { skillCase as principleNeverBlockOnTheHuman } from "./principle-never-block-on-the-human";
import { skillCase as principleOutcomeOrientedExecution } from "./principle-outcome-oriented-execution";
import { skillCase as principleProveItWorks } from "./principle-prove-it-works";
import { skillCase as principleRedesignFromFirstPrinciples } from "./principle-redesign-from-first-principles";
import { skillCase as principleSeparateBeforeSerializingSharedState } from "./principle-separate-before-serializing-shared-state";
import { skillCase as principleSequenceVerifiableUnits } from "./principle-sequence-verifiable-units";
import { skillCase as principleSubtractBeforeYouAdd } from "./principle-subtract-before-you-add";
import { skillCase as principleTestBehaviorNotImplementation } from "./principle-test-behavior-not-implementation";
import { skillCase as principleTypeSystemDiscipline } from "./principle-type-system-discipline";
import { skillCase as recall } from "./recall";
import { skillCase as reflect } from "./reflect";
import { skillCase as setupPstack } from "./setup-pstack";
import { skillCase as sharpen } from "./sharpen";
import { skillCase as showMeYourWork } from "./show-me-your-work";
import { skillCase as statechart } from "./statechart";
import { skillCase as swarm } from "./swarm";
import { skillCase as tdd } from "./tdd";
import { skillCase as teach } from "./teach";
import { skillCase as technicalWriting } from "./technical-writing";
import { skillCase as typescriptBestPractices } from "./typescript-best-practices";
import { skillCase as unslop } from "./unslop";
import { skillCase as why } from "./why";

export const cases: SkillCase[] = [
  architect,
  arena,
  automateMe,
  benchmarkChecklist,
  blastRadius,
  bro,
  correct,
  createFormalVerificationSkill,
  createVerificationSkill,
  figureItOut,
  how,
  inYourOwnWords,
  interrogate,
  ketchup,
  ketchupVideo,
  maintainFormalVerificationSkill,
  maintainVerificationSkill,
  makeBotUi,
  noComments,
  potetoHelp,
  potetoMode,
  principleAttackThePremise,
  principleBoundaryDiscipline,
  principleBuildTheLever,
  principleEncodeLessonsInStructure,
  principleExhaustTheDesignSpace,
  principleExperienceFirst,
  principleExplainTheNumber,
  principleFixRootCauses,
  principleFoundationalThinking,
  principleGuardTheContextWindow,
  principleLazinessProtocol,
  principleMakeOperationsIdempotent,
  principleMigrateCallersThenDeleteLegacyApis,
  principleMinimizeReaderLoad,
  principleModelTheDomain,
  principleNeverBlockOnTheHuman,
  principleOutcomeOrientedExecution,
  principleProveItWorks,
  principleRedesignFromFirstPrinciples,
  principleSeparateBeforeSerializingSharedState,
  principleSequenceVerifiableUnits,
  principleSubtractBeforeYouAdd,
  principleTestBehaviorNotImplementation,
  principleTypeSystemDiscipline,
  recall,
  reflect,
  setupPstack,
  sharpen,
  showMeYourWork,
  statechart,
  swarm,
  tdd,
  teach,
  technicalWriting,
  typescriptBestPractices,
  unslop,
  why,
];

export const casesById = new Map(cases.map((entry) => [entry.id, entry]));
