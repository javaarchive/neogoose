import {Permissions} from "./permissions.js";
import {WordParty} from "./wordparty.js"
import {QualityOfLife} from "./qol.js"
import LLM from "./llm.js";

const modules = [
    Permissions,
    LLM,
    WordParty,
    QualityOfLife
];

export default modules;
export {modules};