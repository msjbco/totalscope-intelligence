export const formatCurrency = (value:number) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact"}).format(value);
