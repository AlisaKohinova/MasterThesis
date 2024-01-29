import React, { useState } from 'react';
import  diff from 'diff-match-patch';

const Diff = ({ text1, text2 }) => {
  const [differences, setDifferences] = useState([]);

  const getDifferences = () => {
    const dmp = new diff();
    const diffs = dmp.diff_main(text1, text2);
    dmp.diff_cleanupSemantic(diffs);

    setDifferences(diffs);
  };

  const renderTextWithHighlights = () => {
    return differences.map((part, index) => {
      const key = `diff-${index}`;

      if (part[0] === 1) {
        // Difference found, render with red background
        return <span key={key} style={{ backgroundColor: 'red' }}>{part[1]}</span>;
      } else if (part[0] === 0) {
        // No difference, render as is
        return part[1];
      }

      return null;
    });
  };

  return (
    <div>
      <button onClick={getDifferences}>Get Differences</button>
      <div>
        <h3>Text 1</h3>
        <p>{text1}</p>
      </div>
      <div>
        <h3>Text 2</h3>
        <p>{text2}</p>
      </div>
      <div>
        <h3>Highlighted Differences</h3>
        {renderTextWithHighlights()}
      </div>
    </div>
  );
};

const Example = () => {
  const originalText = "<p>This is the original. When I was young..</p>";
  const modifiedText = "<p>This is the original text. When I was young.. </p>";

  return (
    <div>
      <h1>Text Comparison Example</h1>
      <Diff text1={originalText} text2={modifiedText} />
    </div>
  );
};

export default Example;
