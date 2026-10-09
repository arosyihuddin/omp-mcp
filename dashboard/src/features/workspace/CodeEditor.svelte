<script lang="ts">
  import { onMount } from 'svelte';
  import { EditorState } from '@codemirror/state';
  import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, crosshairCursor } from '@codemirror/view';
  import { defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, HighlightStyle } from '@codemirror/language';
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
  import { javascript } from '@codemirror/lang-javascript';
  import { json } from '@codemirror/lang-json';
  import { html } from '@codemirror/lang-html';
  import { css } from '@codemirror/lang-css';
  import { python } from '@codemirror/lang-python';
  import { markdown } from '@codemirror/lang-markdown';
  import { yaml } from '@codemirror/lang-yaml';
  import { xml } from '@codemirror/lang-xml';
  import { tags } from '@lezer/highlight';

  let { content, filename, onChange }: { content: string; filename: string; onChange: (value: string) => void } = $props();
  let host: HTMLDivElement;
  let view: EditorView | undefined;

  const codeHighlight = HighlightStyle.define([
    { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.moduleKeyword], color: '#c678dd' },
    { tag: [tags.string, tags.special(tags.string)], color: '#98c379' },
    { tag: [tags.number, tags.integer, tags.float, tags.bool, tags.null], color: '#d19a66' },
    { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--cm-comment)', fontStyle: 'italic' },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#61afef' },
    { tag: [tags.definition(tags.variableName), tags.definition(tags.propertyName)], color: '#e5c07b' },
    { tag: [tags.typeName, tags.className, tags.namespace], color: '#e5c07b' },
    { tag: [tags.operator, tags.punctuation, tags.separator], color: 'var(--cm-fg)' },
    { tag: [tags.propertyName, tags.attributeName], color: '#e06c75' },
    { tag: [tags.tagName, tags.heading], color: '#e06c75' },
    { tag: [tags.attributeValue, tags.regexp], color: '#98c379' },
    { tag: [tags.meta, tags.annotation], color: '#56b6c2' },
  ]);

  const appTheme = EditorView.theme({
    '&': { height: '100%', color: 'rgb(var(--c-fg))', backgroundColor: 'rgb(var(--c-surface-raised))', fontSize: '13px' },
    '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: '1.7' },
    '.cm-content': { padding: '16px 0', caretColor: 'rgb(var(--c-accent))' },
    '.cm-line': { padding: '0 16px' },
    '.cm-gutters': { backgroundColor: 'rgb(var(--c-surface))', color: 'rgb(var(--c-fg-faint))', border: 'none', borderRight: '1px solid rgb(var(--c-line))' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 8px', minWidth: '44px' },
    '.cm-activeLine': { backgroundColor: 'rgb(var(--c-accent) / 0.055)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgb(var(--c-accent) / 0.09)', color: 'rgb(var(--c-fg-muted))' },
    '&.cm-focused': { outline: 'none' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'rgb(var(--c-accent) / 0.22)' },
    '.cm-cursor': { borderLeftColor: 'rgb(var(--c-accent))' },
    '.cm-foldGutter': { width: '12px' },
  }, { dark: false });

  const commentTheme = EditorView.theme({
    '&': { '--cm-comment': 'rgb(var(--c-fg-subtle))', '--cm-fg': 'rgb(var(--c-fg))' }
  });

  function languageForFile(name: string) {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return javascript();
    if (['ts', 'tsx', 'mts', 'cts'].includes(ext)) return javascript({ typescript: true, jsx: ext.endsWith('x') });
    if (['json', 'jsonc'].includes(ext)) return json();
    if (['html', 'svelte', 'vue'].includes(ext)) return html();
    if (['css', 'scss', 'less'].includes(ext)) return css();
    if (['py', 'pyi'].includes(ext)) return python();
    if (['md', 'mdx'].includes(ext)) return markdown();
    if (['yaml', 'yml'].includes(ext)) return yaml();
    if (['xml', 'svg'].includes(ext)) return xml();
    return [];
  }

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: content,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          rectangularSelection(),
          crosshairCursor(),
          history(),
          foldGutter(),
          indentOnInput(),
          bracketMatching(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          syntaxHighlighting(codeHighlight),
          languageForFile(filename),
          appTheme,
          commentTheme,
          keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChange(update.state.doc.toString());
          }),
        ],
      }),
    });

    return () => {
      view?.destroy();
      view = undefined;
    };
  });

  $effect(() => {
    const next = content;
    if (view && view.state.doc.toString() !== next) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
    }
  });

</script>

<div class="h-full min-h-0 min-w-0 flex-1 overflow-hidden" bind:this={host}></div>
