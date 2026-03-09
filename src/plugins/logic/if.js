// If Logic Plugin
export const metadata = {
    id: 'if-condition',
    label: '🔀 If Condition',
    category: 'LOGIC',
};

export const evaluate = (condition, context) => {
    console.log(`Evaluating condition: ${condition}`);
    // Logic to return true/false based on context
    return true;
};
