// Set Variable Plugin
export const metadata = {
    id: 'set-variable',
    label: '📦 Set Variable',
    category: 'UTILITY',
};

export const run = (name, value, context) => {
    context[name] = value;
    console.log(`Variable ${name} set to ${value}`);
};
