/**
 * Pipeline registry
 *
 * Map module name -> module.run function. Import this registry in your runner
 * and call the correct module by name.
 *
 * Usage example in runner:
 *   import registry from '@/lib/pipeline/registry';
 *   const moduleFn = registry['monitor'];
 *   const result = await moduleFn.run({ runId, moduleIndex, inputRef, ... });
 *
 * If your runner expects a different signature adapt the runner or wrap calls here.
 */
import * as monitor from "@/lib/pipeline/modules/monitor";
import * as price from "@/lib/pipeline/modules/price";

const registry: Record<string, any> = {
  monitor,
  price,
};

// default export
export default registry;
