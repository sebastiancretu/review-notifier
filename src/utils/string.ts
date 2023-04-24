export const extractSummaryFromMarkdown = (markdown: string): string => {
  const headingIndex = markdown.search(/^#+\s/m);
  if (headingIndex !== -1) {
    return markdown.substring(0, headingIndex);
  } else {
    return markdown;
  }
};

export const markdownToSlack = (markdown: string): string => {
  // Bold
  markdown = markdown.replace(/\*\*(.*?)\*\*/g, '*$1*');

  // Strikethrough
  markdown = markdown.replace(/~~(.*?)~~/g, '~$1~');

  // Code blocks
  markdown = markdown.replace(/```(.*?)```/gs, '```\n$1\n```');

  // Inline code
  markdown = markdown.replace(/`([^`]+)`/g, '`$1`');

  // Links
  markdown = markdown.replace(/\[(.*?)\]\((.*?)\)/g, '<$2|$1>');

  // Headers
  markdown = markdown.replace(/^(#+)\s*(.*?)\s*$/gm, (_, level, content) => {
    return `*${content}*`;
  });

  // Lists
  markdown = markdown.replace(/^\s*([-*+])\s(.+)/gm, (_, bullet, content) => {
    const slackBullet = bullet === '-' ? '- ' : `${bullet} `;
    return `${slackBullet}${content}`;
  });

  // Replace line breaks with \n characters
  markdown = markdown.replace(/\r?\n/g, '\n');

  return markdown.trim();
};
