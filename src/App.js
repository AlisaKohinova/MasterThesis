import DecoupledEditor from '@ckeditor/ckeditor5-build-decoupled-document';
import React, { Component } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import FormDialog, {cleanTextFromDifferencesMark, fixedColors} from "./FormDialog";
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
// import Button from '@mui/material/Button';
import diff from 'diff-match-patch';

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
        this.setUserChangeFlag(false);
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
        this.setUserChangeFlag(true);
    };

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

 // Function to handle the button click to change text color to red - Function for testing
    handleRedButton = () => {
    if (this.editor) {
      // Get the current editor data
      const currentData = this.editor.getData();

      // Modify the editor data to change text color to red
      const modifiedData = `<span style="color: red;">${currentData}</span>`;

      // Set the modified data back to the editor
      this.editor.setData(modifiedData);
    }
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


    render() {
        const { isSidebarOpen } = this.state;

        const editorConfig = {
            toolbar: [ 'bold', 'italic', 'underline', '|', 'fontColor', 'FontBackgroundColor'],
        };

        const sidebarContent = Object.entries(this.state.filteredJson).map(([key, value], index) => (
            <ListItem key={index}>
            <ListItemText
            primary={`${key}: ${value}`}
            onMouseOver={() => this.handleItemHover(key, value)}
            onMouseLeave={this.handleItemLeave}
            style={{ backgroundColor: this.state.hoveredKey === key ? 'yellow' : 'white' }}
            />
            </ListItem>
    ));

        return (
            <div style={{ display: 'flex', height: '100vh' }}>

                <div style={{ flex: 1, padding: '20px', boxSizing: 'border-box', width: '70%' }}>
                {/*  <Button variant="outlined" onClick={this.handleRedButton}>*/}
                {/*  Change Text Color to Red*/}
                {/*</Button>*/}
                    <FormDialog
                    editorData={this.state.editorData}
                    onApiResponse={this.handleServerResponse}
                    onRedoRule={this.handleRedo} // Pass the handleRedo function as a prop
                    isRuleRevertDisabled={this.state.ruleRevertDisabled}
                    onSetRuleRevertDisabled={this.handleSetRuleRevertDisabled} // Pass the handler function as a prop
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
                        <List>{sidebarContent}</List>
                    </Drawer>
                </div>
            </div>
            );
    }

}

export default App;
