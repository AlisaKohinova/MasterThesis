import React, { useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import ButtonGroup from '@mui/material/ButtonGroup';
import DeleteIcon from '@mui/icons-material/Clear';
import axios from "axios";
import OPENAI_API_KEY from "./config/openai";

let colorIndex = 0;
const colorMap = {}; // Dictionary to store color assignments
const fixedColors = [
  '#ffad2a',
  '#3cbefc',
  '#77e68a',
  '#9d64e2',
  '#fb83b3',
  '#c3effc',
  '#FF9999',
  // Add more colors as needed
];

function removeEmptyPairs(obj) {
  // Create a new object to store non-empty pairs
  const filteredObj = {};

  // Iterate over the object's keys
  for (const key in obj) {
    const value = obj[key];

    // Check if the value is not an empty array, empty string, or empty object
    if (
      ((typeof value !== 'object' || Object.keys(value).length > 0) &&
      (value !== '' && (!Array.isArray(value) || (Array.isArray(value) && value.length > 0))))
    ) {
      // Add the non-empty pair to the filtered object
      filteredObj[key] = value;
    }
  }

  return filteredObj;
}


export default function FormDialog({editorData,onApiResponse, onRedoRule}) {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const [selectedRuleText, setSelectedRuleText] = useState('');

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleRevertRule = () => {
    // Use the passed onRedoRule function when the button is clicked
    onRedoRule();
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleCreateRule = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries(formData.entries());
    const newRule = {
      if_text: formJson.if_text,
      then_text: formJson.then_text,
    };
    setRules([...rules, newRule]);
    handleClose();
  };

  const handleButtonClick = async(ruleText) => {
    setSelectedRuleText(ruleText);
    // Perform additional actions based on the button click if needed
    // For example, you can display the text in a <p> element.
    console.log(`Clicked on button with text: ${ruleText}`); // THIS IS A RULE WE WILL BE USING
    const prompt = 'The next is the text we are working on: ' + editorData + '   \nThe rule for modifying the text is: ' + ruleText + '   \n Only return me the modified text without any explanations. Only pure HTML text'
    console.log(prompt);


  //   try {
  //   const response = await axios.get("https://openlibrary.org/search.json?q=the+lord+of+the+rings");
  //   const responseData = response.data.docs[0].title;
  //   onApiResponse(responseData);
  // } catch(err) {
  //   console.log("error: ", err);
  // }
let classificationResult = ''
   // Classification first
      const classification_prompt = 'Classify the following text into 2 classes (the goal of the text of the first class "Changing" is changing the text, the second class "Suggestions" is suggest options (Especially when text contains word "Suggest" - classify it as second class)). Return me only the name ("Suggestions" or "Changing") of 1 selected class.\nThe text: ' + ruleText
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
                    "content": classification_prompt
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
        classificationResult = response.data.choices[0].message.content.toLowerCase();
        // onApiResponse(responseData);
      } catch (error) {
        console.error('Error:', error);
      }

      if (classificationResult.includes('changing'))
      {
          // Changing task
          console.log('changing task')
          const prompt = 'The next is the text we are working on: ' + editorData + '   \nThe rule for modifying the text is: ' + ruleText + '   \n Only return me the modified text without any explanations. Only pure HTML text'
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
        const filteredJson = {}
        onApiResponse(responseData, filteredJson);
      } catch (error) {
        console.error('Error:', error);
      }

      }
      else
      {
          console.log('Suggestions task')
          const suggestions_prompt = 'The text: ' + editorData + '\nThe task: ' + ruleText + '\nReturn the dictionary of original text parts mapped to suggestions in JSON format. JSON cannot be nested'
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
                    "content": suggestions_prompt
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
        // Extracting JSON
        const startIndex = responseData.indexOf('{');

        // Find the index of the last curly brace (}) to locate the end of the JSON string
        const endIndex = responseData.lastIndexOf('}');

        // Extract the JSON string
        const jsonString = responseData.slice(startIndex, endIndex + 1);

        const jsonObject = JSON.parse(jsonString);
        const filteredJson = removeEmptyPairs(Object.fromEntries(
          Object.entries(jsonObject).filter(([key, value]) => key !== value)
        ));
        // filteredJson = removeEmptyPairs(filteredJson)
        console.log(jsonObject)
        onApiResponse(editorData, filteredJson);

      } catch (error) {
        console.error('Error:', error);
      }
      }


  };

  const handleDeleteRule = (index, rule) => {
    const updatedRules = [...rules];
    updatedRules.splice(index, 1);
    setRules(updatedRules);
    delete colorMap[rule.if_text + rule.then_text];
  };

const getColorForRule = (rule) => {
    // console.log(rule.if_text + rule.then_text)
    const rule_id = rule.if_text + rule.then_text
    console.log(colorIndex)

  if (colorMap.hasOwnProperty(rule_id)) {
      return colorMap[rule_id];
  }
  else {
    colorMap[rule_id] = fixedColors[colorIndex % 7];
      colorIndex += 1;
    return colorMap[rule_id];
  }
};

  return (
    <div>
        <div style={{verticalAlign: 'middle'}}>
      <Button variant="outlined" onClick={handleClickOpen} style={{ paddingTop: '6px', paddingBottom: '6px', marginRight: '5px'}}>
        +
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          component: 'form',
          onSubmit: handleCreateRule,
        }}
      >
        <DialogTitle>Create new rule</DialogTitle>
        <DialogContent>
          <DialogContentText>
            To create a new rule, please fill If and Then parts.
          </DialogContentText>
          <p>If</p>
          <TextField
            autoFocus
            required
            margin="dense"
            id="if_text"
            name="if_text"
            type="text"
            fullWidth
            variant="standard"
          />
          <p>Then</p>
          <TextField
            autoFocus
            required
            margin="dense"
            id="then_text"
            name="then_text"
            type="text"
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit">Create</Button>
        </DialogActions>
      </Dialog>

        <ButtonGroup aria-label=" primary button group" color="primary" variant="filledTonal" style={{ width: '64%' }}>


      {rules.map((rule, index) => (

        <div key={index} style={{ display: 'flex', alignItems: 'center',
            borderRadius: '5px', backgroundColor: getColorForRule(rule),
 marginLeft: '4px', marginRight: '4px'}}>
          <Button
            onClick={() => handleButtonClick(`If ${rule.if_text} then ${rule.then_text}`)}
            style={{borderRadius: '5px', color: 'white', fontSize: '12px', paddingRight: '1px', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
            title={`If ${rule.if_text} then ${rule.then_text}`} // Set the full text as the title attribute
          >
            {`If ${rule.if_text.slice(0, 3)}.. then ${rule.then_text.slice(0, 3)}..`}
          </Button>
          <IconButton onClick={() => handleDeleteRule(index, rule)} color="error" style={{paddingLeft: '3px'}}>
            <DeleteIcon />
          </IconButton>

        </div>
      ))}
                        </ButtonGroup>
            </div>
      {selectedRuleText && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <p style={{ marginRight: '10px' }}>
            Selected Rule: <strong>{selectedRuleText}</strong>
          </p>
          <Button variant="outlined" onClick={handleRevertRule}>
            Revert Rule
          </Button>
        </div>
      )}
    </div>
  );
}
