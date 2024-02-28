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
// import DeleteIcon from '@mui/icons-material/Clear';
import axios from "axios";
import OPENAI_API_KEY from "./config/openai";
// import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem'; // Import MenuItem for dropdown
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { addDataToCSV} from "./App";

let colorIndex = 0;
const colorMap = {}; // Dictionary to store color assignments
export const fixedColors = [
  '#ffad2a',
  '#3cbefc',
  '#77e68a',
  '#FF6347',
  '#9d64e2',
  '#fb83b3',
  '#01B8AA',
  '#FE9666'
  // Add more colors as needed
];

export const colorsToClean = [
    '#d2ebff',
    '#ffad2a',
    '#3cbefc',
    '#77e68a',
    '#FF6347',
    '#9d64e2',
    '#fb83b3',
    '#01B8AA',
    '#FE9666'
]
let LAST_USED_COLOR = '';

function stripSurroundingText(message) {
    return message.replace(/^[^`]*```html\s*|\s*```[^`]*$/g, '');
}

function removeEmptyPairs(obj) {
  const filteredObj = {};

  for (const key in obj) {
    const value = obj[key];

    if (
      ((typeof value !== 'object' || Object.keys(value).length > 0) &&
      (value !== '' && (!Array.isArray(value) || (Array.isArray(value) && value.length > 0))))
    ) {
      filteredObj[key] = value;
    }
  }

  return filteredObj;
}

export function cleanTextFromDifferencesMark(textHtml) {

    colorsToClean.forEach(color => {
        const regex = new RegExp('<span[^>]*style\\s*=\\s*["\']\\s*[^"\']*background-color:\\s*' + color + '[^"\']*["\'][^>]*>(.*?)<\\/span>', 'gi');
        textHtml = textHtml.replace(regex, '$1');
    });

    return textHtml;
}

export function countTimeStamp() {
    return (performance.now()).toString();
}

export default function FormDialog({editorData,onApiResponse, onRedoRule, onSetRuleRevertDisabled, isRuleRevertDisabled}) {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const [selectedRuleText, setSelectedRuleText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#ffad2a'); // State for selected color

  const handleClickOpen = () => {
    addDataToCSV(['Create rule - Open dialog', 'CR', countTimeStamp(), 'none'])
    const availableIndices = fixedColors
    .map((color, index) => index)
    .filter(index => index !== LAST_USED_COLOR);

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];

    setSelectedColor(fixedColors[randomIndex]);
    LAST_USED_COLOR = randomIndex;
    setOpen(true);
  };

  const handleRevertRule = () => {
    addDataToCSV(['Revert rule', 'RR', countTimeStamp(), 'none'])
    onRedoRule();
  };

  const handleClose = () => {
    addDataToCSV(['Create rule - Close dialog', 'CR', countTimeStamp(), 'none'])
    setOpen(false);
  };

  const handleCreateRule = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries(formData.entries());
    addDataToCSV(['Handle creating rule - Receive Submit', 'HR', countTimeStamp(), JSON.stringify(formJson)])

    let newName = formJson.name_text || '';
    const selectedColor = formJson.color; // Retrieve selected color

    if (!newName.trim()) {
    const naming_rule_prompt = 'I will give you a rule text, you should return ONLY the short name of this rule (maximum 16 symbols) and corresponding emoji at the start of the name \n' +
        'Here is the rule text: If ' + formJson.if_text + ' then ' + formJson.then_text;

    addDataToCSV(['Handle creating rule - API Request - Naming the rule. Start', 'HR', countTimeStamp(), 'If ' + formJson.if_text + ' then ' + formJson.then_text])
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
                    "content": naming_rule_prompt
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
        newName = response.data.choices[0].message.content.replace(/^"|"$/g, '').trim();
        addDataToCSV(['Create rule - API Request - Naming the rule. End', 'HR', countTimeStamp(), newName])
    }
    catch (error) {
      console.error('Error fetching random name:', error);
    }
    }

    const newRule = {
      name_text: newName,
      if_text: formJson.if_text,
      then_text: formJson.then_text,
      color: selectedColor // Add selected color to the new rule
    };
    setRules([...rules, newRule]);
    handleClose();
  };

  const [editingRule, setEditingRule] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleOpenEditDialog = (index, rule) => {
    setEditingRule({ index, ...rule });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditingRule(null);
    setEditDialogOpen(false);
  };

  const handleEditRule = async (event) => {
      console.log('editing')
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries(formData.entries());

    let newName = formJson.name_text || '';

    if (!newName.trim()) {
      const naming_rule_prompt =
        'I will give you a rule text, you should return ONLY the name of this rule (maximum 24 symbols)\n' +
        'Here is the rule text: If' +
        formJson.if_text +
        ' then ' +
        formJson.then_text;

      try {
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo-1106',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant.',
              },
              {
                role: 'user',
                content: naming_rule_prompt,
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
          }
        );
        newName = response.data.choices[0].message.content.replace(/^"|"$/g, '').trim();

      } catch (error) {
        console.error('Error fetching random name:', error);
      }
    }

    if (editingRule) {
      // Update existing rule
      const updatedRules = [...rules];
      updatedRules[editingRule.index] = {
        ...editingRule, // Preserve existing properties of the rule
        name_text: newName,
        if_text: formJson.if_text,
        then_text: formJson.then_text,
      };
      setRules(updatedRules);
    } else {
      // Create new rule
      const newRule = {
        name_text: newName,
        if_text: formJson.if_text,
        then_text: formJson.then_text,
      };
      setRules([...rules, newRule]);
    }

    handleCloseEditDialog();
  };

  const handleDeleteRule = () => {
    if (editingRule && editingRule.index !== undefined) {
      const updatedRules = [...rules];
      updatedRules.splice(editingRule.index, 1);
      setRules(updatedRules);
      delete colorMap[editingRule.if_text + editingRule.then_text];
      handleCloseEditDialog();
    }
  };

  const handleButtonClick = async(ruleText, color) => {
    setSelectedRuleText(ruleText);
    onSetRuleRevertDisabled(false);

    console.log(`Clicked on button with text: ${ruleText}`);
    console.log('000000', editorData)
    editorData = cleanTextFromDifferencesMark(editorData);

    setIsLoading(true);


  // random API for testing
  //   try {
  //   const response = await axios.get("https://openlibrary.org/search.json?q=the+lord+of+the+rings");
  //   const responseData = response.data.docs[0].title;
  //   onApiResponse(responseData);
  // } catch(err) {
  //   console.log("error: ", err);
  // }

    let classificationResult = ''
   // Classification of the rule request
      const classification_prompt = 'You need to classify the following rule into 3 classes: Class Changing, Class Suggestions or Class Feedback.\n' +
          'If the rule\'s goal is to directly change the text, then it\'s class Changing.\n' +
          'If the rule\'s goal is to suggest something to user, then it\'s class Suggestions.\n' +
          'If the rule\'s goal is to return feedback, opinion to user or instructions for text improvement, then it\'s class Feedback.\n' +
          'You must only return the name of the selected Class.\n' +
          '\nHere is the rule:' + ruleText
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
        const responseData = stripSurroundingText(response.data.choices[0].message.content);
        const filteredJson = {}
        onApiResponse(responseData, filteredJson, color);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
      }
      else if (classificationResult.includes('suggestions'))
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
        const endIndex = responseData.lastIndexOf('}');
        const jsonString = responseData.slice(startIndex, endIndex + 1);
        const jsonObject = JSON.parse(jsonString);

        const filteredJson = removeEmptyPairs(Object.fromEntries(
          Object.entries(jsonObject).filter(([key, value]) => key !== value)
        ));
        console.log(jsonObject)
        onApiResponse(editorData, filteredJson, color);

      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
      }
      else {
        console.log('Feedback task')
          const feedback_prompt = 'The text: ' + editorData + '\nThe task: ' + ruleText
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
                    "content": feedback_prompt
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
        const filteredJson = {'Feedback': response.data.choices[0].message.content}
        onApiResponse(editorData, filteredJson, color);

      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
      }
  };

  // const handleDeleteRule = (index, rule) => {
  //   const updatedRules = [...rules];
  //   updatedRules.splice(index, 1);
  //   setRules(updatedRules);
  //   delete colorMap[rule.if_text + rule.then_text];
  // };

  const getColorForRule = (rule) => {
    if (rule.color) {
    return rule.color; // If a color is explicitly assigned to the rule, use it
    } else {
    const rule_id = rule.if_text + rule.then_text;

    if (colorMap.hasOwnProperty(rule_id)) {
      return colorMap[rule_id];
    } else {
      colorMap[rule_id] = fixedColors[colorIndex % 7];
      colorIndex += 1;
      return colorMap[rule_id];
    }
    }
  };



// a little function to help us with reordering the result
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const grid = 8;

const getItemStyle = (isDragging, draggableStyle) => ({
  userSelect: 'none',
  padding: grid * 1.6,
  margin: `0 ${grid}px 0 0`,
  borderRadius: '6px',
  // change background colour if dragging
  background: isDragging ? 'lightgreen' : '#f1f1f1',

  ...draggableStyle,
});

const getListStyle = isDraggingOver => ({
  background: isDraggingOver ? '#D2E3FC' : 'white',
  display: 'flex',
  borderRadius: '6px',
  overflow: 'auto',
  padding: '4px', // some padding looks good, but the toolbar takes too much space in a result
});

const onDragEnd = (result) => {
  // dropped outside the list
  if (!result.destination) {
    return;
  }
  const items = reorder(
    rules,
    result.source.index,
    result.destination.index
  );

  setRules(items);
};


  return (
    <div>
        <div style={{ border: "1px solid lightgrey", borderRadius: '5px', padding: '10px', paddingRight: '5px', position: 'fixed', backgroundColor: 'white', width: '72%', zIndex: '1000'}}>
        <ButtonGroup className={"scrollable-div"} aria-label="primary button group" color="primary" variant="filledTonal" style={{ width: '100%'}}>
        <Button variant="outlined" onClick={handleClickOpen} style={{ borderRadius: '5px', paddingTop: '6px', paddingBottom: '6px', marginRight: '9px'}}>
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
            To create a new rule, please fill the following details:
          </DialogContentText>
          <p>Name (optional)</p>
            <TextField
            autoFocus
            margin="dense"
            id="name_text"
            name="name_text"
            type="text"
            fullWidth
            onChange={ (e) => {
                      addDataToCSV(['Create rule - Change Name Field', 'CR', countTimeStamp(), e.target.value]);
                    }}
            variant="standard"
          />
              <p>Select Color</p>
              <TextField
                select
                id="color"
                name="color"
                value={selectedColor}
                onChange={(e) => {
                      addDataToCSV(['Create rule - Choose color', 'CR', countTimeStamp(), selectedColor + ' -> ' + e.target.value]);
                      setSelectedColor(e.target.value);
                    }}
                fullWidth
                variant="standard"
              >
                {fixedColors.map((color) => (
                  <MenuItem key={color} value={color}>
                    <div style={{ width: '20px', height: '20px', backgroundColor: color, marginRight: '5px' }}></div>
                  </MenuItem>
                ))}
              </TextField>
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
            onChange={ (e) => {
                      addDataToCSV(['Create rule - Change If Field', 'CR', countTimeStamp(), e.target.value]);
                    }}
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
            onChange={ (e) => {
                      addDataToCSV(['Create rule - Change Then Field', 'CR', countTimeStamp(), e.target.value]);
                    }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
          handleClose();
           addDataToCSV(['Create rule - Button CANCEL Pressed', 'CR', countTimeStamp(), 'none']);
        }}>Cancel</Button>
          <Button type="submit"
          onClick={() => {
           addDataToCSV(['Create rule - Button CREATE Pressed', 'CR', countTimeStamp(), 'none']);
        }}>Create</Button>
        </DialogActions>
      </Dialog>

<DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable" direction="horizontal">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              style={getListStyle(snapshot.isDraggingOver)}
              {...provided.droppableProps}
            >
      {rules.map((rule, index) => (
  <Draggable key={index} draggableId={`rule-${index}`} index={index}>
    {(provided, snapshot, rubric) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
      >
        <div key={index} style={{ height: '36px', alignItems: 'center', padding: '0 8px', flexGrow: 1, display: 'flex', justifyContent: 'space-between', minWidth: '50px',
      borderRadius: '5px', backgroundColor: getColorForRule(rule), marginLeft: '0px', marginRight: '0px', paddingLeft: '0px', paddingRight: '0px', }}>
          <Button
                      {...provided.draggableProps}

              {...provided.dragHandleProps}
              onClick={() => handleButtonClick(`If ${rule.if_text} then ${rule.then_text}`, getColorForRule(rule))}
              style={{
borderRadius: '5px', color: 'white', fontSize: '11px', paddingRight: '3px', marginTop: '2px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: '15px'}} title={`If ${rule.if_text} then ${rule.then_text}`}>
            {`${rule.name_text.slice(0, 16)}${rule.name_text.length > 16 ? '..' : ''}` || 'Unnamed Rule'}
          </Button>
          <IconButton onClick={() => handleOpenEditDialog(index, rule)} color="white">
            <EditIcon style={{ color: 'white', fontSize: '16px', opacity: '0.5'}} />
          </IconButton>
        </div>
      </div>
    )}
  </Draggable>
))}                  {provided.placeholder} {/* This line renders the placeholder */}

            </div>
             )}

        </Droppable>
</DragDropContext>



      </ButtonGroup>
      </div>
      {selectedRuleText && (
  <div style={{ display: 'flex', alignItems: 'center', paddingTop: '10px', position: 'absolute', top: '130px', left: 22, marginBottom: '20px'}}>
    <p style={{ marginRight: '10px' }}>
      Selected Rule: <strong>{selectedRuleText}</strong>
    </p>
    {isLoading ? (
      <CircularProgress size={20} style={{ marginLeft: '10px' }} />
    ) : (
      <Button variant="outlined" onClick={handleRevertRule} disabled={isRuleRevertDisabled}>
        Revert Rule
      </Button>
    )}
  </div>
)}

         {/* Edit Rule Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        PaperProps={{
          component: 'form',
          onSubmit: handleEditRule,
        }}
      >
        <DialogTitle>Edit Rule</DialogTitle>
        <DialogContent>
          <DialogContentText>
            To edit the rule, please modify the following details:
          </DialogContentText>
          <p>Name (optional)</p>
          <TextField
            autoFocus
            margin="dense"
            id="name_text"
            name="name_text"
            type="text"
            defaultValue={editingRule ? editingRule.name_text : ''}
            fullWidth
            variant="standard"
          />
          <p>If</p>
          <TextField
            autoFocus
            required
            margin="dense"
            id="if_text"
            name="if_text"
            type="text"
            defaultValue={editingRule ? editingRule.if_text : ''}
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
            defaultValue={editingRule ? editingRule.then_text : ''}
            fullWidth
            variant="standard"
          />
        </DialogContent>
        <DialogActions >

          {editingRule && (
            <Button color="error" onClick={handleDeleteRule}>
              Delete
            </Button>
          )}
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button type="submit">Save Changes</Button>

        </DialogActions>
      </Dialog>
    </div>


  );
}
