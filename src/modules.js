import {Permissions} from "./permissions.js";
import {WordParty} from "./wordparty.js"
import {QualityOfLife} from "./qol.js"
import LLM from "./llm.js";
import BasicLLM from "./llm_basic.js";
import LLMConversations from "./llm_advanced.js";

const modules = [
    Permissions,
    LLM,
    // WordParty,
    QualityOfLife,
    // basic llm implementation, TODO: write more advanced version with actually useful features
    BasicLLM,
    LLMConversations
];

export default modules;
export {modules};