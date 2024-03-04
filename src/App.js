import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import React, { Component } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import FormDialog, {cleanTextFromDifferencesMark, countTimeStamp, customStringify, fixedColors} from "./FormDialog";
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
// import Button from '@mui/material/Button';
import diff from 'diff-match-patch';
import axios from "axios";
import OPENAI_API_KEY from "./config/openai";
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import {CSVLink} from "react-csv";

export let csvData= [
  ["name", "class", "timestamp", "detail1"],
];

export function addDataToCSV(newData) {
csvData.push(newData);
}

// const newData = ["John", "Doe", "john.doe@example.com"];
// addDataToCSV(newData);

class App extends Component {

    editor = null;
    constructor(props) {
        super(props);
        this.state = {
            editorData: "<p>Hello from CKEditor 5!</p>",
            appDisplayText: '',
            serverResponse: '',
            isSidebarOpen: true,
            filteredJson: {},
            history: '<p>Hello from CKEditor 5!</p>',
            historyJson : {},
            ruleRevertDisabled: false,
            replacedKeys: [],
            listItemClicked: null, // New state variable to track the clicked ListItem
            previousSelection: null,
            leftPartSelection: '',
            rightPartSelection: '',
        };
    }


    ckeditorRef = React.createRef();
    handleSetRuleRevertDisabled = (value) => {
        this.setState({ ruleRevertDisabled: value });
    };

    updateAppDisplayText = (displayText) => {
        this.setState({ appDisplayText: displayText });
    };

    handleServerResponse = (responseData, filteredJson, color) => {
        console.log('Server Response in App.js:', responseData);
        console.log('Additional Data in App.js:', filteredJson);
        if (filteredJson.hasOwnProperty('<p>')) {
            delete filteredJson['<p>'];
        }
        this.setUserChangeFlag(false);
        responseData = this.state.leftPartSelection + responseData + this.state.rightPartSelection
        this.updateHistory(this.state.editorData, this.state.filteredJson);

        this.setState({ serverResponse: responseData });
        this.setState({ filteredJson: filteredJson });
        if (this.editor) {
            this.editor.setData(responseData);
            this.setState({ filteredJson: filteredJson});
        }
        if (this.editor) {
            this.editor.setData(this.highlightTextDifferences(this.state.editorData, responseData, color));
        }
        addDataToCSV(['Display new information', 'DI', countTimeStamp(), 'Editor data: ---' + this.editor.getData().replace(/"|”|;/g, '||') + '--- filteredJson: ' + customStringify(filteredJson, ';').replace(/"|”|;/g, '||')])
        console.log(this.editor.getData().replace(/"|”|;/g, '||'))
        this.setUserChangeFlag(true);
    };

   SplitAroundSubstring(string, substring) {
        const index = string.indexOf(substring);
        let leftPart = "";
        let rightPart = "";

        if (index !== -1) {
            leftPart = string.substring(0, index);
            rightPart = string.substring(index + substring.length);
        }
        console.log('Left part', leftPart)
        console.log('Right part', rightPart)
       console.log(substring)
       this.setState({ leftPartSelection: cleanTextFromDifferencesMark(leftPart) });
       this.setState({ rightPartSelection: cleanTextFromDifferencesMark(rightPart) });
    }

    // Function to handle the button click to change text color to red - Function for testing
    handleRedButton = () => {
        console.log(this.getSelectionText())
        this.SplitAroundSubstring(this.state.editorData, this.getSelectionText())
    };

    componentDidMount() {
        // Add event listener when the component mounts
        document.addEventListener('mouseup', this.handleTextSelection);
        window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    componentWillUnmount() {
        // Remove event listener when the component unmounts
        document.removeEventListener('mouseup', this.handleTextSelection);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }

    handleBeforeUnload = (e) => {
        const message = 'Are you sure you want to leave?';
        e.returnValue = message;
        return message;
    };

    handleTextSelection = () => {
        const currentSelection = this.getSelectionText();
        const previousSelection = this.state.previousSelection;
        if (currentSelection && !previousSelection) {
            // Text is newly selected
            console.log('Text selected:', currentSelection);
            // Perform any action you want with the selected text here
        } else if (!currentSelection && previousSelection) {
            // Text is deselected
            console.log('Text deselected');
            // Perform any action you want for deselection
        }
        console.log(currentSelection)
        // Update the previous selection for the next comparison
        this.setState({ previousSelection: currentSelection });
        this.SplitAroundSubstring(this.state.editorData, currentSelection)
    };

  getSelectionText() {
    let selected_text = "";
    if (window.getSelection) {
        selected_text = window.getSelection().toString();
    } else if (document.selection && document.selection.type !== "Control") {
        selected_text = document.selection.createRange().text;
    }
      if (!selected_text) {
          return this.state.editorData;
      }
    // addDataToCSV(['Selection of the text', 'ST', countTimeStamp(), selected_text.toString()])
    return selected_text;
    }

    setUserChangeFlag = (value) => {
      this.isUserChange = value;
    };

    overwriteHighlightedAreas(textHtml) {
      fixedColors.forEach(color => {
        const regex = new RegExp(
          `<span[^>]*style\\s*=\\s*["']\\s*[^"']*background-color:\\s*${color}[^"']*["'][^>]*>(.*?)<\\/span>`,
          'gi'
        );
        // Replace the matched span with its content only if it's highlighted
        textHtml = textHtml.replace(regex, '$1');
      });
      return textHtml;
    }


    highlightTextDifferences = (text1, text2, color) => {
      const dmp = new diff();
      const diffs = dmp.diff_main(cleanTextFromDifferencesMark(text1), text2);
      dmp.diff_cleanupSemantic(diffs);

      return diffs.map((part, index) => {

        if (part[0] === 1) {
          // Difference found, render with red background
          return `<span style='background-color: ${color};'>${part[1]}</span>`;
        } else if (part[0] === 0) {
          // No difference, render as is
          return part[1];
        }

        return '';
      }).join('');
    };

    updateHistory = (responseData, filteredJson) => {
        console.log('History upd')
        this.setState({ history: responseData});
        this.setState({ historyJson: filteredJson});
    };

    handleRedo = () => {
        console.log('handleRedo upd')
        console.log(this.state.history)

        if (this.editor) {
            this.editor.setData(this.state.history);
            this.setState({ filteredJson: this.state.historyJson});
        }
        addDataToCSV(['Handling Redo', 'RR', countTimeStamp(), 'New editorData: ---' + this.state.history.replace(/"/g, '||') + '--- New filteredJson: ---' + customStringify(this.state.historyJson, ';')])

        this.setState({ruleRevertDisabled: true})
    };

     handleItemHover = (key, value) => {
        console.log(`Hovered over: ${key}: ${value}`);
        this.setState({ hoveredKey: key });

        // Get the CKEditor instance
        const editor = this.ckeditorRef.current.editor;

        // Select the corresponding key in the editor and make it bold
        const currentData = editor.getData();
        const modifiedData = currentData.replace(new RegExp(`${key}`, 'g'), `<strong>${key}</strong>`);
        editor.setData(modifiedData);
      };

    handleItemLeave = () => {
      this.setState({ hoveredKey: null });

      // Get the CKEditor instance
      const editor = this.ckeditorRef.current.editor;

      // Remove the bold styling from the entire editor content
      const currentData = editor.getData();
      const modifiedData = currentData.replace(/<strong>/g, '').replace(/<\/strong>/g, '');
      editor.setData(modifiedData);
    };

    handleReplaceKey = (key, value) => {
        addDataToCSV(['Suggestions Block - Replace Key Button Pressed', 'SB', countTimeStamp(), key.replace(/"/g, '||') + ' -> ' + value.replace(/"/g, '||')])
        if (this.editor && key && value) {
            const currentData = this.editor.getData();

            const regex = new RegExp(`${key}`, 'g');
            const highlightedData = currentData.replace(
                regex,
                `<span style="background-color: #d2ebff; font-weight: normal;">${value}</span>`
            );
            // Update replacedKeys state to mark the key as replaced
            // Update replacedKeys state to include the clicked key
            this.setState((prevState) => ({
                replacedKeys: [...prevState.replacedKeys, key],
                listItemClicked: key, // Set the clicked ListItem
            }));

            this.editor.setData(highlightedData);
        }
    };

    handleRegenerateKey = async (key, value) => {
        addDataToCSV(['Suggestions Block - Regenerate Button Pressed', 'SB', countTimeStamp(), key.replace(/"/g, '||') + ' -> ' + value.replace(/"/g, '||')])
        const regeneration_prompt = 'You need to return a synonymic word or phrase. Only return a synonymic word or phrase itself, without ANY additional words.\n' +
            'DO NOT return ' + value +
            '\nWord or phrase: ' + key
        addDataToCSV(['Handling Suggestions Block - Regenerate Button API Request. Start', 'HSB', countTimeStamp(), value.replace(/"/g, '||')])
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
                        "content": regeneration_prompt
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
            const regeneration_result = response.data.choices[0].message.content;
            console.log('key: ', key, 'reg res:', regeneration_result, 'but not synonymic', value)
            this.setState(prevState => ({
            filteredJson: {
                ...prevState.filteredJson,
                [key]: regeneration_result,
            },
            }));
            addDataToCSV(['Handling Suggestions Block - Regenerate Button API Request. End', 'HSB', countTimeStamp(), 'Old key: ' + key.replace(/"/g, '||') + ' -> New Key: ' + regeneration_result.replace(/"/g, '||')])

        } catch (error) {
            console.error('Error:', error);
          }
    };

    copyToClipboard = (value) => {
        addDataToCSV(['Suggestions Block - Copy to Clipboard Button Pressed', 'SB', countTimeStamp(), value.replace(/"/g, '||')])
        navigator.clipboard.writeText(value)
            .then(() => {
                console.log('Text copied to clipboard:', value);
            })
            .catch((error) => {
                console.error('Error copying text to clipboard:', error);
            });
    }


    render() {
        const { isSidebarOpen } = this.state;

        const editorConfig = {
            toolbar: [ 'bold', 'italic', 'underline', '|', 'fontColor', 'FontBackgroundColor'],
        };

        const sidebarContent = Object.entries(this.state.filteredJson).map(([key, value], index) => {
          if (key === 'Feedback') {
            return (
              <ListItem key={index}>
                <ListItemText primary={value} />
              </ListItem>
            );
          } else {
            return (
               <ListItem key={index}
                         style={{ position: 'relative',
                         }}
                         onMouseOver={() => this.handleItemHover(key, value)}
                            onMouseLeave={this.handleItemLeave}>
                        <ListItemText
                            primary={`${key}: ${value}`}
                            style={{
                                backgroundColor: this.state.hoveredKey === key ? '#F1F1F1' : 'white',
                                paddingTop: '8px',
                                paddingBottom: '8px',
                                paddingRight: '8px',
                                paddingLeft: '8px',
                                  ...(this.state.replacedKeys.includes(key)
                                ? {
                                      backgroundColor: '#d2ebff', // Change to lightblue for clicked items
                                  }
                                : {}),
                            }}
                        />
                        {this.state.hoveredKey === key && (
                            <IconButton
                                onClick={() => this.copyToClipboard(value)}
                                style={{
                                    position: 'absolute',
                                    bottom: '-7px',
                                    right: '127px',
                                    zIndex: '1',
                                    backgroundColor: 'transparent',
                                    width: '4px',
                                    transform: 'scale(0.77)'
                                }}
                            >
                                <FileCopyIcon />
                            </IconButton>
                        )}
                        {this.state.hoveredKey === key && (
                            <IconButton
                                onClick={() => this.handleRegenerateKey(key, value)}
                                style={{
                                    position: 'absolute',
                                    bottom: '-7px',
                                    right: '100px',
                                    zIndex: '1',
                                    backgroundColor: 'transparent',
                                    width: '5px'
                                }}
                            >
                                <RefreshIcon />
                            </IconButton>
                        )}
                        {this.state.hoveredKey === key && !this.state.replacedKeys[key] && (
                        <button
                            onClick={() => this.handleReplaceKey(key, value)}
                            style={{
                                position: 'absolute',
                                bottom: '5px',
                                right: '5px',
                                zIndex: '1',
                            }}
                        >
                            Replace Text
                        </button>
                    )}
                    {this.state.hoveredKey === key && this.state.replacedKeys[key] && (
                        <button
                            disabled
                            style={{
                                position: 'absolute',
                                bottom: '5px',
                                right: '5px',
                                paddingRight: '12px',
                                paddingLeft: '12px',
                                backgroundColor: 'light green',
                                zIndex: '1',
                            }}
                        >
                            Replaced
                        </button>
                        )}
                    </ListItem>
            );
          }
        });

        return (
            <div style={{ display: 'flex', height: '100vh' }}>

                <div style={{ flex: 1, padding: '20px', boxSizing: 'border-box', width: '70%' }}>
                {/*  <Button variant="outlined" onClick={this.handleRedButton}>*/}
                {/*  Change Text Color to Red*/}
                {/*</Button>*/}
                    <FormDialog
                    editorData={this.state.previousSelection}
                    onApiResponse={this.handleServerResponse}
                    onRedoRule={this.handleRedo}
                    isRuleRevertDisabled={this.state.ruleRevertDisabled}
                    onSetRuleRevertDisabled={this.handleSetRuleRevertDisabled}
                    />
                    <div className='EditorField' style={{ width: '75%'}}>
                        <CKEditor
                        ref={this.ckeditorRef}

                        onReady={editor => {
                            const editableElement = editor.ui.getEditableElement();
                            if (editableElement) {
                                editableElement.parentElement.insertBefore(
                                editor.ui.view.toolbar.element,
                                editableElement
                                );
                            }
                            this.editor = editor;
                        }}

                        onError={(error, { willEditorRestart }) => {
                            if (willEditorRestart) {
                                this.editor.ui.view.toolbar.element.remove();
                            }
                        }}

                        onChange={(event, editor) => {
                            const data = editor.getData();
                            addDataToCSV(['Editor Field - Change', 'EF', countTimeStamp(), data.replace(/"|”|;/g, '||')]);
                            // const cleanedData = this.overwriteHighlightedAreas(data);
                            if (this.isUserChange) {
                            //     const cleanedData = this.overwriteHighlightedAreas(data);
                            // this.setState({ editorData: cleanedData });
                            }
                            this.setState({ editorData: data });
                        }}
                        editor={DecoupledEditor}
                        data={this.state.editorData}
                        config={editorConfig}
                        />

                    </div>
                    <Drawer anchor="right" variant="permanent" open={isSidebarOpen} sx={{ width: 340, '& .MuiDrawer-paper': { width: '340px !important' } }}>
                        <List style={{paddingTop: '15px'}}>{sidebarContent}</List>
                    </Drawer>
                    <CSVLink data={csvData}
                     className="download-link-hidden"
                    >Download</CSVLink>

                </div>
            </div>
            );
    }

}

export default App;
