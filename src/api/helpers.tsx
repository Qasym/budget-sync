// Interfaces
import { ActionFunction } from "react-router-dom";
import { Period } from "../components/Buttons/PeriodSelector";
import { Asset } from "../components/Dashboard/Assets";
import { Category } from "../components/Dashboard/Categories";
import { Transaction } from "../components/Dashboard/Transactions";

export interface DataItem {
  [key: string]: any;
}

/* -------------- Data Management -------------- */

export const actionHandler: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const { _action, ...values } = Object.fromEntries(formData);

  const handleResponse = async (response: Response) => {
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Request failed!");
    }
    return response.json();
  };

  const requestOptions = (method: string, body: any) => ({
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  try {
    switch (_action) {
      case "createAsset":
        await handleResponse(
          await fetch(
            "http://localhost:8989/assets",
            requestOptions("POST", {
              id: "",
              name: values.name,
              initBalance: values.initBalance,
              currency: values.currency,
            })
          )
        );
        return null;

      case "editAsset":
        await handleResponse(
          await fetch(
            `http://localhost:8989/assets/${values.asset_id}`,
            requestOptions("PUT", values)
          )
        );
        return null;

      case "deleteAsset":
        await handleResponse(
          await fetch(`http://localhost:8989/assets/${values.asset_id}`, {
            method: "DELETE",
          })
        );
        return null;

      case "createTransaction":
        await handleResponse(
          await fetch(
            "http://localhost:8989/transactions",
            requestOptions("POST", {
              id: "",
              name: values.name,
              asset_id: values.asset_id,
              category_id: values.category_id,
              source: values.source,
              asset_from_id: values.asset_from_id,
              amount: values.amount,
              currency: values.currency,
              date: new Date(values.date),
              createdAt: Date.now(),
              type: values.type,
            })
          )
        );
        return null;

      case "editTransaction":
        await handleResponse(
          await fetch(
            `http://localhost:8989/transactions/${values.transaction_id}`,
            requestOptions("PUT", values)
          )
        );
        return null;

      case "deleteTransaction":
        await handleResponse(
          await fetch(
            `http://localhost:8989/transactions/${values.transaction_id}`,
            { method: "DELETE" }
          )
        );
        return null;

      case "createCategory":
        await handleResponse(
          await fetch(
            "http://localhost:8989/categories",
            requestOptions("POST", {
              id: "",
              name: values.name,
              totalBudgeted: values.totalBudgeted,
              currency: values.currency,
            })
          )
        );
        return null;

      case "editCategory":
        await handleResponse(
          await fetch(
            `http://localhost:8989/categories/${values.category_id}`,
            requestOptions("PUT", values)
          )
        );
        return null;

      case "deleteCategory":
        await handleResponse(
          await fetch(
            `http://localhost:8989/categories/${values.category_id}`,
            { method: "DELETE" }
          )
        );
        return null;

      // Uncomment and implement if you decide to include goals
      // case "createGoal":
      // ...
      // case "editGoal":
      // ...
      // case "deleteGoal":
      // ...

      default:
        throw new Error("Unknown action!");
    }
  } catch (error) {
    console.log(error);
    throw new Error(error.message);
  }

  return null;
};

// Fetch data from the API
export const fetchData = async (table: string) => {
  const response = await fetch(`http://localhost:8989/${table}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch data!");
  }

  return response.json();
};

/* -------------- Asset and Category -------------- */

// Calculate Spent By Category

// Get matching item
export const getAllMatchingItems = (
  table: string,
  key: string,
  value: string
) => {
  const data = fetchData(table);
  const filteredData = data.filter((d: DataItem) => d[key] === value);
  return filteredData[0];
};

export const spentByCategory = (
  category: Category,
  currencyRates: DataItem,
  period: Period
) => {
  const transactions = fetchData("transactions") as Transaction[];
  const filteredTransactions = filterTransactions(
    transactions,
    "Date",
    convertPeriodToString(period)
  );

  const total = filteredTransactions.reduce((spent: number, transaction) => {
    if (transaction.category_id === category.id) {
      return (
        spent +
        (Number(currencyRates[category.currency]) *
          Number(transaction.amount)) /
          Number(currencyRates[transaction.currency])
      );
    }
    return spent;
  }, 0);
  return total;
};

export const getCategorySpentHistory = (
  period: Period,
  baseCurrency: string | null,
  rates: DataItem
) => {
  const transactions = sortFilterTransactions(
    fetchData("transactions"),
    "Date",
    convertPeriodToString(period),
    "Date",
    "Ascending"
  ) as Transaction[];
  if (!transactions || transactions.length === 0) return undefined;

  const categories = fetchData("categories") as Category[];

  const months: string[] = [];
  const startDate = new Date(transactions[0].date);
  const endDate = new Date(transactions[transactions.length - 1].date);
  for (
    let d = new Date(startDate);
    d.getFullYear() <= endDate.getFullYear() &&
    d.getMonth() <= endDate.getMonth();
    d.setMonth(d.getMonth() + 1)
  ) {
    months.push(d.toISOString().slice(0, 7));
  }

  const spentHistoryMap: DataItem = {};
  for (let i = 0; i < months.length; i++) {
    spentHistoryMap[months[i]] = {};
    for (let j = 0; j < categories.length; j++) {
      spentHistoryMap[months[i]][categories[j].name] = 0;
    }
  }

  transactions.forEach((transaction) => {
    const month = new Date(transaction.date).toISOString().slice(0, 7);
    const category = categories.find((a) => a.id === transaction.category_id);
    if (category) {
      spentHistoryMap[month][category.name] += +transaction.amount;
    }
  });

  for (let i = 0; i < months.length; i++) {
    for (let j = 0; j < categories.length; j++) {
      const change = spentHistoryMap[months[i]][categories[j].name];
      spentHistoryMap[months[i]][categories[j].name] = baseCurrency
        ? +convertCurrency(
            rates,
            categories[j].currency,
            baseCurrency,
            change
          ).toFixed(2)
        : change;
    }
  }

  const spentHistory = Object.entries(spentHistoryMap).map(
    ([month, categorySpent]) => {
      return {
        ["month"]: month,
        ...categorySpent,
      };
    }
  );

  return spentHistory;
};

// Calculate Balance of Asset
export const getBalanceOfAsset = (asset: Asset) => {
  const transactions = fetchData("transactions") as Transaction[];
  let balance = +asset.initBalance;
  const now = new Date();

  transactions.forEach((transaction) => {
    if (
      new Date(transaction.date) < new Date(now) &&
      transaction.asset_id === asset.id
    ) {
      balance +=
        transaction.type === "expense"
          ? -Number(transaction.amount)
          : +Number(transaction.amount);
    } else if (
      new Date(transaction.date) < new Date(now) &&
      transaction.asset_from_id === asset.id
    ) {
      balance -= Number(transaction.amount);
    }
  });

  return balance;
};

export const getAssetDetails = (asset: Asset, period: Period) => {
  const transactions = filterTransactions(
    fetchData("transactions"),
    "Date",
    convertPeriodToString(period)
  );
  let income = 0;
  let expense = 0;
  let transferTo = 0;
  let transferFrom = 0;

  transactions.forEach((transaction) => {
    if (asset.id === transaction.asset_id) {
      switch (transaction.type) {
        case "income":
          income += Number(transaction.amount);
          break;
        case "expense":
          expense += Number(transaction.amount);
          break;
        case "transfer":
          transferTo += Number(transaction.amount);
      }
    } else if (asset.id === transaction.asset_from_id) {
      transferFrom += Number(transaction.amount);
    }
  });

  return {
    income: income,
    expense: expense,
    transferTo: transferTo,
    transferFrom: transferFrom,
  };
};

interface balanceHistoryItem {
  month: string; // (e.g., '2024-06')
  [key: string]: string | number; // key = id, value = amount
}

export const getAssetBalanceHistory = (
  period: Period,
  baseCurrency: string | null,
  rates: DataItem
) => {
  const transactions = sortFilterTransactions(
    fetchData("transactions"),
    "Date",
    convertPeriodToString(period),
    "Date",
    "Ascending"
  ) as Transaction[];
  if (!transactions || transactions.length === 0) return undefined;
  const assets = fetchData("assets") as Asset[];

  const months: string[] = [];
  const startDate = new Date(transactions[0].date);
  const endDate = new Date(transactions[transactions.length - 1].date);
  for (
    let d = new Date(startDate);
    d.getFullYear() <= endDate.getFullYear() &&
    d.getMonth() <= endDate.getMonth();
    d.setMonth(d.getMonth() + 1)
  ) {
    months.push(d.toISOString().slice(0, 7));
  }

  const balanceHistoryMap: DataItem = {};
  for (let i = 0; i < months.length; i++) {
    balanceHistoryMap[months[i]] = {};
    for (let j = 0; j < assets.length; j++) {
      balanceHistoryMap[months[i]][assets[j].name] = 0;
    }
  }

  transactions.forEach((transaction) => {
    const month = new Date(transaction.date).toISOString().slice(0, 7);
    const asset = assets.find((a) => a.id === transaction.asset_id);
    if (asset) {
      switch (transaction.type) {
        case "income":
          balanceHistoryMap[month][asset.name] += +transaction.amount;
          break;
        case "expense":
          balanceHistoryMap[month][asset.name] += -transaction.amount;
          break;
        case "transfer":
          balanceHistoryMap[month][asset.name] += +transaction.amount;
          const assetFrom = assets.find(
            (a) => a.id === transaction.asset_from_id
          );
          if (assetFrom)
            balanceHistoryMap[month][assetFrom.name] += -transaction.amount;
          break;
      }
    }
  });

  const curBalances = [];
  for (let i = 0; i < assets.length; i++) {
    curBalances.push(assets[i].initBalance);
  }

  for (let i = 0; i < months.length; i++) {
    for (let j = 0; j < assets.length; j++) {
      const change = balanceHistoryMap[months[i]][assets[j].name];
      curBalances[j] = Number(curBalances[j]) + Number(change);
      balanceHistoryMap[months[i]][assets[j].name] = baseCurrency
        ? convertCurrency(
            rates,
            assets[j].currency,
            baseCurrency,
            curBalances[j]
          )
        : curBalances[j];
    }
  }

  const balanceHistory: balanceHistoryItem[] = Object.entries(
    balanceHistoryMap
  ).map(([month, assetBalances]) => {
    return {
      ["month"]: month,
      ...assetBalances,
    };
  });

  return balanceHistory;
};

const adjustDate = (date: Date, unit: string, adjustment: number) => {
  if (unit === "day") {
    date.setDate(date.getDate() + adjustment);
  } else if (unit === "week") {
    date.setDate(date.getDate() + adjustment * 7);
  } else if (unit === "month") {
    date.setMonth(date.getMonth() + adjustment);
  } else if (unit === "year") {
    date.setFullYear(date.getFullYear() + adjustment);
  }
};

const convertPeriodToString = (period: Period): string[] => {
  if (period.type === "absolute") return [period.start, period.end];

  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  if (period.option === "Past") {
    adjustDate(startDate, period.unit, -Number(period.value ?? 1));
  } else if (period.option === "Next") {
    adjustDate(startDate, period.unit, Number(period.value ?? 1));
  } else if (period.unit === "Year") {
    startDate.setMonth(0, 1);
    endDate.setMonth(11, 31);
  } else if (period.unit === "Month") {
    startDate.setDate(1);
    endDate.setMonth(now.getMonth() + 1);
    endDate.setDate(0);
  } else if (period.unit === "Week") {
    const dayOfWeek = now.getDay();
    startDate.setDate(now.getDate() - dayOfWeek + 1);
    endDate.setDate(now.getDate() + (7 - dayOfWeek));
  }

  return [formatDateToInputValue(startDate), formatDateToInputValue(endDate)];
};

/* -------------- Transactions -------------- */

// Sort-Filter Transactions

const filterTransactions = (
  transactions: Transaction[],
  filterOption: string,
  filterValue: string[]
) => {
  if (filterValue.length === 1 && filterValue[0] === "") return transactions;
  if (filterOption === "None") return transactions;

  let filterFunction: (transaction: Transaction) => boolean;

  switch (filterOption) {
    case "Name":
      filterFunction = (transaction) =>
        transaction.name.toLowerCase().includes(filterValue[0].toLowerCase());
      break;

    case "Asset":
      filterFunction = (transaction) => {
        return (
          transaction.asset_id === filterValue[0] ||
          transaction.asset_from_id === filterValue[0]
        );
      };
      break;

    case "Category":
      filterFunction = (transaction) => {
        return transaction.category_id === filterValue[0];
      };
      break;

    case "Type":
      filterFunction = (transaction) => {
        return transaction.type === filterValue[0];
      };
      break;

    case "Date":
      if (filterValue[0] === "allTime") {
        filterFunction = () => true;
        break;
      }

      let startDate = new Date(filterValue[0]);
      let endDate = new Date(filterValue[1]);

      filterFunction = (transaction) => {
        return (
          new Date(transaction.date) >= startDate &&
          new Date(transaction.date) <= endDate
        );
      };
      break;

    case "Amount":
      filterFunction = (transaction) => {
        const minAmount = filterValue[0] === "" ? 0 : Number(filterValue[0]);
        const maxAmount =
          filterValue[1] === "" ? Infinity : Number(filterValue[1]);
        return (
          transaction.amount >= minAmount && transaction.amount <= maxAmount
        );
      };
      break;

    default:
      filterFunction = () => true;
      break;
  }

  return transactions.filter(filterFunction);
};

const sortTransactions = (
  transactions: Transaction[],
  sortOption: string,
  sortValue: string
) => {
  if (sortValue === "") return transactions;

  let sortFunction: (a: Transaction, b: Transaction) => number;
  switch (sortOption) {
    case "Last Edited":
      sortFunction = (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      break;
    case "Name":
      sortFunction = (a, b) => a.name.localeCompare(b.name);
      break;
    case "Asset":
      sortFunction = (a, b) => {
        const assetA =
          getAllMatchingItems("assets", "id", a.asset_id)[0]?.name ?? "";
        const assetB =
          getAllMatchingItems("assets", "id", b.asset_id)[0]?.name ?? "";
        return assetA.localeCompare(assetB);
      };
      break;
    case "Category":
      sortFunction = (a, b) => {
        const categoryA =
          getAllMatchingItems("categories", "id", a.category_id)[0]?.name ?? "";
        const categoryB =
          getAllMatchingItems("categories", "id", b.category_id)[0]?.name ?? "";
        return categoryA.localeCompare(categoryB);
      };
      break;
    case "Date":
      sortFunction = (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime();
      break;
    case "Amount":
      sortFunction = (a, b) => a.amount - b.amount;
      break;
    case "Type":
      sortFunction = (a, b) => a.type.localeCompare(b.type);
      break;
    default:
      sortFunction = () => 0;
      break;
  }

  const directionMultiplier = sortValue === "Ascending" ? 1 : -1;

  return transactions.sort((a, b) => directionMultiplier * sortFunction(a, b));
};

export const sortFilterTransactions = (
  transactions: Transaction[],
  filterOption: string,
  filterValue: string[],
  sortOption: string,
  sortValue: string
) => {
  return sortTransactions(
    filterTransactions(transactions, filterOption, filterValue),
    sortOption,
    sortValue
  );
};

/* -------------- Currency -------------- */

interface CachedRates {
  rates: { [key: string]: any };
  timestamp: number;
}

// Get Currency Rates
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_KEY = "currencyRatesCache";

export const getCurrencyRates = async (baseCurrency: string = "USD") => {
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    const parsedData: CachedRates = JSON.parse(cachedData);
    const currentTime = Date.now();

    if (currentTime - parsedData.timestamp < CACHE_DURATION) {
      return parsedData.rates;
    }
  }

  const response = await fetch(
    `https://v6.exchangerate-api.com/v6/3ff658fcac35df0f62ba4089/latest/${baseCurrency}`
  );
  const data = await response.json();

  if (data.result !== "success") {
    throw new Error("Failed to get currencies");
  }

  const newCache: CachedRates = {
    rates: data.conversion_rates,
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));

  return newCache.rates;
};

// List of currencies
export const getAllCurrencies = () => [
  "USD",
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "ANG",
  "AOA",
  "ARS",
  "AUD",
  "AWG",
  "AZN",
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BHD",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BRL",
  "BSD",
  "BTN",
  "BWP",
  "BYN",
  "BZD",
  "CAD",
  "CDF",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CUP",
  "CVE",
  "CZK",
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "ERN",
  "ETB",
  "EUR",
  "FJD",
  "FKP",
  "FOK",
  "GBP",
  "GEL",
  "GGP",
  "GHS",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  "HKD",
  "HNL",
  "HRK",
  "HTG",
  "HUF",
  "IDR",
  "ILS",
  "IMP",
  "INR",
  "IQD",
  "IRR",
  "ISK",
  "JEP",
  "JMD",
  "JOD",
  "JPY",
  "KES",
  "KGS",
  "KHR",
  "KID",
  "KMF",
  "KRW",
  "KWD",
  "KYD",
  "KZT",
  "LAK",
  "LBP",
  "LKR",
  "LRD",
  "LSL",
  "LYD",
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MRU",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SBD",
  "SCR",
  "SDG",
  "SEK",
  "SGD",
  "SHP",
  "SLE",
  "SLL",
  "SOS",
  "SRD",
  "SSP",
  "STN",
  "SYP",
  "SZL",
  "THB",
  "TJS",
  "TMT",
  "TND",
  "TOP",
  "TRY",
  "TTD",
  "TVD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "UYU",
  "UZS",
  "VES",
  "VND",
  "VUV",
  "WST",
  "XAF",
  "XCD",
  "XDR",
  "XOF",
  "XPF",
  "YER",
  "ZAR",
  "ZMW",
  "ZWL",
];

// Convert Currency
export const convertCurrency = (
  rates: DataItem,
  currencyFrom: string,
  currencyTo: string,
  amount: number
) => {
  return (
    (Number(rates[currencyTo]) * Number(amount)) / Number(rates[currencyFrom])
  );
};

/* -------------- Formatting -------------- */

// Format Date
export const formatDate = (date: Date): string => {
  const day = new Date(date).getDate();
  const month = new Date(date).toLocaleString("default", { month: "long" });
  const year = new Date(date).getFullYear();

  return `${month} ${day}, ${year}`;
};

export const formatDateMonthStr = (monthYear: string): string => {
  const date = new Date(monthYear + "-01");
  const month = new Date(date).toLocaleString("default", { month: "long" });
  const year = new Date(date).getFullYear();

  return `${month} ${year}`;
};

export const formatDateToInputValue = (date: Date): string => {
  const day = new Date(date).getDate();
  const month = new Date(date).getMonth() + 1;
  const year = new Date(date).getFullYear();

  const dayStr = day < 10 ? `0${day}` : `${day}`;
  const monthStr = month < 10 ? `0${month}` : `${month}`;

  return `${year}-${monthStr}-${dayStr}`;
};

// Format Currency
export const formatCurrency = (amount: number, currency: string) => {
  const amountStr = +(+amount).toFixed(2);
  return amountStr + " " + currency;
};
