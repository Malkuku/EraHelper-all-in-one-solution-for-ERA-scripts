import YAML from 'yaml';
import { HostContext } from './GenerationHost';

// Helper variable macros normally run on the global GENERATE_AFTER_DATA event.
// Independent requests must expand them locally instead of broadcasting that event.
export function substituteTaskMacros(ctx: HostContext, text: string): string {
  const read = (type: 'message' | 'chat' | 'character' | 'preset' | 'global', path: string) => {
    const option: VariableOption = type === 'message'
      ? { type, message_id: ctx.chat.findLastIndex(message => _.isObject(message.variables?.[message.swipe_id ?? 0])) }
      : { type };
    const value = _.get(getVariables(option), _.unescape(path), null);
    const withoutPrivate = (item: any): any => {
      if (Array.isArray(item)) return item.map(withoutPrivate);
      if (_.isPlainObject(item)) return Object.fromEntries(Object.entries(item)
        .filter(([key]) => !key.startsWith('$')).map(([key, child]) => [key, withoutPrivate(child)]));
      return item;
    };
    return withoutPrivate(value);
  };
  text = ctx.substituteParams(text);
  text = text.replace(/\{\{get_(message|chat|character|preset|global)_variable::(.*?)\}\}/gi,
    (_match, type, path) => {
      const value = read(type.toLowerCase() as Parameters<typeof read>[0], path);
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
  for (const quoted of [true, false]) {
    const source = `^(.*)\\{\\{format_(message|chat|character|preset|global)_variable${quoted ? '_quoted' : ''}::(.*?)\\}\\}`;
    const format = (_match: string, prefix: string, type: string, path: string): string => {
      prefix = prefix.replace(new RegExp(source, 'im'), format);
      const value = read(type.toLowerCase() as Parameters<typeof read>[0], path);
      const formatted = typeof value === 'string' ? value : YAML.stringify(value, {
        blockQuote: 'literal', ...(quoted ? { defaultKeyType: 'PLAIN' as const, defaultStringType: 'QUOTE_DOUBLE' as const } : {}),
      }).trimEnd();
      return prefix + formatted.replaceAll('\n', '\n' + ' '.repeat(prefix.length));
    };
    text = text.replace(new RegExp(source, 'gim'), format);
  }
  return text;
}
