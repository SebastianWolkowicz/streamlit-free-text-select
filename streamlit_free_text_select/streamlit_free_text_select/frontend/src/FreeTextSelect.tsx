import React, { ReactNode } from "react";
import Select, { ClearIndicatorProps, CSSObjectWithLabel, GroupBase, StylesConfig, MultiValue, ActionMeta, InputActionMeta } from "react-select";
import Creatable, { useCreatable } from 'react-select/creatable';
import {
  ComponentProps,
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection
} from "streamlit-component-lib";
import FreeTextSelectStyle from "./styling";
import CreatableSelect from "react-select/creatable";


interface State {
  isFocused: boolean
  extended: boolean;
  selectedOption: OptionType[];
  inputOption: string | null;
}


interface OptionType {
  label: string | null;
  value: string | null;
  userInput: boolean | null;
}


class FreeTextSelect extends StreamlitComponentBase<State> {
  private style = new FreeTextSelectStyle(this.props.theme!);

  constructor(props: ComponentProps) {
    super(props);
    const options = this._getOptionsFromArgs();
    this.state = {
      isFocused: false,
      extended: false,
      selectedOption: (props.args.index !== null) ? [options[props.args.index]] : [],
      inputOption: null,
    }
    if (this.state.selectedOption.length > 0) {
      this._updateComponent(this.state.selectedOption);
    }

    this._handleInputChange = this._handleInputChange.bind(this);
    this._handleOnChange = this._handleOnChange.bind(this);
    this._updateComponent = this._updateComponent.bind(this);
    this._updateInputOption = this._updateInputOption.bind(this);
    this._debounce = this._debounce.bind(this);
  }

  public render = (): ReactNode => {
    const debouncedInputChange = this._debounce(this._handleInputChange, this.props.args.delay);


    return (
      <div style={this.style.wrapper}>
        {this.props.args.label_visibility !== "collapsed" && (
          <div style={{ visibility: this.props.args.label_visibility }}>
            <label style={this.style.label}>
              {this.props.args.label}
            </label>
          </div>
        )}
        <Creatable<OptionType, true>

          id={this.props.args.key ? this.props.args.key : "free-text-selectbox"}
          value={this.state.selectedOption}
          placeholder={this.props.args.placeholder}
          options={this._getOptions()}
          styles={{
            ...this.style.select,
            multiValue: (base: CSSObjectWithLabel) => ({
              ...base,
              margin: '5px',
            }),
            multiValueLabel: (base: CSSObjectWithLabel) => ({
              ...base,
              whiteSpace: 'normal',
            }),
          } as StylesConfig<OptionType, true, GroupBase<OptionType>>}
          components={{
            ClearIndicator: (props: ClearIndicatorProps<OptionType, true, GroupBase<OptionType>>) =>
              this.style.clearIndicator(props),
            DropdownIndicator: () => this.style.iconDropdown(this.state.extended),
            IndicatorSeparator: () => <div></div>,
          }}
          onChange={(newValue: MultiValue<OptionType>, actionMeta: ActionMeta<OptionType>) => {
            return this._handleOnChange(Array.from(newValue || []));
          }}
          onInputChange={
            (inputValue: string, actionMeta: InputActionMeta) => {
              if (actionMeta.action === "input-change") {
                debouncedInputChange(inputValue);
              }
            }
          }
          onKeyDown={this._handleKeyDown}
          isClearable={true}
          isSearchable={true}
          onMenuOpen={() => this.setState({ extended: true })}
          onMenuClose={() => this.setState({ extended: false })}
          menuIsOpen={this.state.extended}
          isDisabled={this.props.args.disabled}
          menuPlacement="auto"
          isMulti={this.props.args.multi}
        />
      </div>
    )



      ;
  };

  private _getOptionsFromArgs(): OptionType[] {
    return this.props.args.options.map((option: string) => {
      return { label: option, value: option, userInput: false };
    })
  }

  private _getOptions(): OptionType[] {
    let options = this._getOptionsFromArgs();

    if (this.state.inputOption !== null && this.state.inputOption.trim() !== "") {
      options = options.filter(option => option.label?.toLowerCase().includes(this.state.inputOption!.toLowerCase()));
      options.unshift({ label: `Select all matching elements`, value: "select_all_matching", userInput: false });
      options.unshift({ label: this.state.inputOption, value: this.state.inputOption, userInput: true });
    } else {
      options.unshift({ label: `Select all elements`, value: "select_all", userInput: false });
    }

    return options;
  }


  private _handleInputChange(inputValue: string): void {
    this.setState({ inputOption: inputValue });
    this.setState({ extended: false });
    this.setState({ extended: true });

  }




  // private _handleInputChange(inputValue: string): void {
  //   const options = this._getOptions();
  //   const matchedOption = options.find(option => option.label === inputValue);

  //   if (!matchedOption && inputValue.trim() !== "") {
  //     const newOption = { label: inputValue, value: inputValue, userInput: true };
  //     this.setState(prevState => ({
  //       selectedOption: [...prevState.selectedOption, newOption]
  //     }));
  //     this._updateComponent([...this.state.selectedOption, newOption]);
  //   }
  // }

  private _handleOnChange(option: OptionType[] | null): void {
    if (option === null) {
      if (this.state.selectedOption.length > 0) {
        this.setState({ selectedOption: [] });
        this._updateComponent([]);
      }
    } else {
      if (option.some(opt => opt.value === "select_all")) {
        const allOptions = this._getOptionsFromArgs();
        this.setState({ selectedOption: allOptions });
        this._updateComponent(allOptions);
      } else if (option.some(opt => opt.value === "select_all_matching")) {
        const matchingOptions = this._getOptionsFromArgs().filter(opt => opt.label?.toLowerCase().includes(this.state.inputOption!.toLowerCase()));
        this.setState({ selectedOption: matchingOptions });
        this._updateComponent(matchingOptions);
      } else {
        this._updateComponent(option);
        this.setState({ selectedOption: option });
      }
    }
  }

  private _handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Enter' && this.state.inputOption) {
      const options = this._getOptions();
      const matchedOption = options.find(option => option.label === this.state.inputOption);

      if (!matchedOption && this.state.inputOption.trim() !== "") {
        const newOption = { label: this.state.inputOption, value: this.state.inputOption, userInput: true };
        this.setState(prevState => ({
          selectedOption: [...prevState.selectedOption, newOption],
          inputOption: null
        }));
        this._updateComponent([...this.state.selectedOption, newOption]);
      }
    }
  }


  private _updateComponent(options: OptionType[]): void {
    if (options.length === 0) {
      Streamlit.setComponentValue(null);
    } else {
      Streamlit.setComponentValue(options.map(option => option.value));
    }
  }

  private _updateInputOption(option: OptionType): void {
    if (option.value === null || option.value === "" || option.value === undefined) {
      this.setState({ inputOption: null });
    } else {
      this.setState({ inputOption: option.value });
    }
  }

  private _debounce(func: (...args: any[]) => void, timeout: number = 300) {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }
}


export default withStreamlitConnection(FreeTextSelect)
