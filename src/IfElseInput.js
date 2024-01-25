// MaterialInputComponent.jsx
import axios from 'axios';
import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import OPENAI_API_KEY from './config/openai';

const IfElseInput = ({ onDisplayTextChange, onApiResponse, editorText }) => {
    const [inputValue1, setInputValue1] = useState(''); // IF
    const [inputValue2, setInputValue2] = useState(''); // THEN
    // In case of displaying the text in this component
    // const [displayText, setDisplayText] = useState('');

    const handleInputChange1 = (e) => {
        setInputValue1(e.target.value);
    };

    const handleInputChange2 = (e) => {
        setInputValue2(e.target.value);
    };

    const handleButtonClick = async () => {
        console.log(editorText);
        // Concatenate the values of both input fields
        const concatenatedText = 'If ' + inputValue1 + ', then ' + inputValue2;
        // Update displayText with the concatenated text
        // In case of displaying the text in this component
        // setDisplayText(concatenatedText);

        // Clear the input fields
        setInputValue1('');
        setInputValue2('');

        // Pass the displayText value to the parent component (App.js)
        onDisplayTextChange(concatenatedText);

        // Creating prompt
        const prompt = 'The next is the text we are working on: ' + editorText + '   \nThe rule for modifying the text is: ' + concatenatedText + '   \n Only return me the modified text without any explanations. Only pure HTML text'
        console.log(prompt);
        // REQUEST TO API
        // Send a request to a server with the concatenated text
        try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
                "model": "gpt-3.5-turbo-1106",
                "messages": [
                  {
                    "role": "system",
                    "content": "You are a helpful assistant."
                  },
                  {
                    "role": "user",
                    "content": prompt
                  }
                ]
              },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
          }
            );
        console.log(response.data);
        console.log(response.data.choices[0].message.content);
        const responseData = response.data.choices[0].message.content;
        onApiResponse(responseData);
      } catch (error) {
        console.error('Error:', error);
      }


// TEST API
  //     try {
  //   const response = await axios.get("https://openlibrary.org/search.json?q=the+lord+of+the+rings");
  //   const responseData = response.data.docs[0].title;
  //   onApiResponse(responseData);
  // } catch(err) {
  //   console.log("error: ", err);
  // }
    };

    return (
        <div className="IfElseInput">
            <p>If </p>
            <TextField
                label="Enter text 1"
                variant="outlined"
                value={inputValue1}
                onChange={handleInputChange1}
                sx={{ marginLeft: '5px', marginRight: '5px', width: '300px' }}
            />
            <p> then </p>
            <TextField
                label="Enter text 2"
                variant="outlined"
                value={inputValue2}
                onChange={handleInputChange2}
                sx={{ marginLeft: '5px', marginRight: '5px', width: '300px' }}
            />
            <Button
                variant="contained"
                onClick={handleButtonClick}
                sx={{ marginLeft: '15px', marginRight: '5px'}}
            >
                Apply
            </Button>

            {/*{displayText && <p>{displayText}</p>}*/}
        </div>
    );
};

export default IfElseInput;
