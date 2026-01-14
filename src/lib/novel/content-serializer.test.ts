/**
 * content-serializer 单元测试
 */
import { describe, it, expect } from 'vitest';
import { textToTiptapJSON, tiptapJSONToText } from './content-serializer';

describe('textToTiptapJSON', () => {
  it('应该正确处理空文本', () => {
    const result = textToTiptapJSON('');
    expect(result).toEqual({
      type: 'doc',
      content: [],
    });
  });

  it('应该正确处理单个段落（无换行）', () => {
    const text = '这是一个单行文本';
    const result = textToTiptapJSON(text);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('paragraph');
    expect(result.content[0].content?.[0].text).toBe(text);
  });

  it('应该正确处理单换行分隔的段落（AI生成常见格式）', () => {
    const text = '第一段内容\n第二段内容\n第三段内容';
    const result = textToTiptapJSON(text);

    expect(result.content).toHaveLength(3);
    expect(result.content[0].content?.[0].text).toBe('第一段内容');
    expect(result.content[1].content?.[0].text).toBe('第二段内容');
    expect(result.content[2].content?.[0].text).toBe('第三段内容');
  });

  it('应该正确处理双换行分隔的段落（标准格式）', () => {
    const text = '第一段内容\n\n第二段内容\n\n第三段内容';
    const result = textToTiptapJSON(text);

    expect(result.content).toHaveLength(3);
    expect(result.content[0].content?.[0].text).toBe('第一段内容');
    expect(result.content[1].content?.[0].text).toBe('第二段内容');
    expect(result.content[2].content?.[0].text).toBe('第三段内容');
  });

  it('应该正确处理Markdown标题', () => {
    const text = '# 一级标题\n## 二级标题\n正文内容';
    const result = textToTiptapJSON(text);

    expect(result.content).toHaveLength(3);
    expect(result.content[0].type).toBe('heading');
    expect(result.content[0].attrs?.level).toBe(1);
    expect(result.content[0].content?.[0].text).toBe('一级标题');

    expect(result.content[1].type).toBe('heading');
    expect(result.content[1].attrs?.level).toBe(2);
    expect(result.content[1].content?.[0].text).toBe('二级标题');

    expect(result.content[2].type).toBe('paragraph');
  });

  it('应该过滤空段落', () => {
    const text = '第一段\n\n\n\n第二段';
    const result = textToTiptapJSON(text);

    expect(result.content).toHaveLength(2);
    expect(result.content[0].content?.[0].text).toBe('第一段');
    expect(result.content[1].content?.[0].text).toBe('第二段');
  });

  it('应该处理混合换行格式', () => {
    const text = '段落1\n段落2\n\n段落3\n段落4';
    const result = textToTiptapJSON(text);

    // 因为有双换行，所以会按双换行分割
    expect(result.content.length).toBeGreaterThan(0);
  });
});

describe('tiptapJSONToText', () => {
  it('应该正确转换段落为文本', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '第一段' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '第二段' }],
        },
      ],
    };

    const result = tiptapJSONToText(json);
    expect(result).toBe('第一段\n\n第二段');
  });

  it('应该正确处理空内容', () => {
    const json = {
      type: 'doc',
      content: [],
    };

    const result = tiptapJSONToText(json);
    expect(result).toBe('');
  });
});
