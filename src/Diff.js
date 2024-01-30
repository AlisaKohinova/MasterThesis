import React from 'react';
import diff from 'diff-match-patch';

const getHighlightedDifferences = (text1, text2) => {
  const dmp = new diff();
  const diffs = dmp.diff_main(text1, text2);
  dmp.diff_cleanupSemantic(diffs);

  return diffs.map((part, index) => {

    if (part[0] === 1) {
      // Difference found, render with red background
      return `<span style='background-color: red;'>${part[1]}</span>`;
    } else if (part[0] === 0) {
      // No difference, render as is
      return part[1];
    }

    return '';
  }).join('');
};


const Example = () => {
  const originalText = "<p>This is the original. When I was young I..</p>";
  const modifiedText = "<p>This is the original text. When I was young my.. </p>";

  const highlightedDifferences = getHighlightedDifferences(originalText, modifiedText);
  console.log(highlightedDifferences)

  return (
    <div>
      <h1>Text Comparison Example</h1>
      <div>
        <h3>Highlighted Differences</h3>
        <div dangerouslySetInnerHTML={{ __html: highlightedDifferences }} />
      </div>
    </div>
  );
};

export default Example;