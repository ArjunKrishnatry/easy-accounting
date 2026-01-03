import React from 'react';

type DropDownProps = {
  classifications: string[];
  showDropDown: boolean;
  toggleDropDown: () => void;
  classificationSelection: (classification: string) => void;
};

const DropDown: React.FC<DropDownProps> = ({
  classifications,
  showDropDown,
  toggleDropDown,
  classificationSelection,
}) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={toggleDropDown} className="dropdown-button">
        Select an option
      </button>
      {showDropDown && (
        <div
          className="dropdown-menu"
          style={{
            position: 'absolute',
            zIndex: 1000,
            background: 'white',
            color: 'black',
            listStyle: 'none',
            padding: 0,
            margin: 0,
            border: '1px solid #ccc',
            maxHeight: '200px',
            overflowY: 'auto',
            width: '200px',
          }}
        >
          {classifications.map((classification: string, index: number) => (
            <p
              key={index}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
                margin: 0,
              }}
              onClick={() => classificationSelection(classification)}
            >
              {classification}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropDown;
