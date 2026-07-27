import { creditService } from "./packages/services/credits";
console.log(creditService);
creditService.hasEnoughTokens("123", 100).then(console.log).catch(console.error);
