import {Permissions} from "./permissions.js";
import {WordParty} from "./wordparty.js"
import {QualityOfLife} from "./qol.js"
import LLM from "./llm.js";
import BasicLLM from "./llm_basic.js";

const modules = [
    Permissions,
    LLM,
    WordParty,
    QualityOfLife,
    BasicLLM
];

export default modules;
export {modules};