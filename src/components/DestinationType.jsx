const DestinationType = ({onChange, value}) => {
    return (
        <div className="radio-container">
            <label>
                <input
                    type="radio"
                    value="coffee"
                    checked={value === "coffee"}
                    onChange={onChange}
                />
                &nbsp;☕️ Coffee
            </label>
            <label>
                <input
                    type="radio"
                    value="bubble tea"
                    checked={value === "bubble tea"}
                    onChange={onChange}
                />
                &nbsp;🧋 Boba
            </label>
        </div>
    );
}

export default DestinationType;