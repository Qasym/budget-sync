// react imports
import { useRef, useState } from "react";

// rrd imports
import { Form } from "react-router-dom";

// library imports
import {
  ArrowLongRightIcon,
  ArrowsUpDownIcon,
  PlusIcon,
  FunnelIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";

// interfaces
import { Asset } from "./Assets";
import { Category } from "./Categories";

// components
import TransactionForm from "./TransactionForm";

// helper functions
import {
  formatCurrency,
  formatDate,
  getAllMatchingItems,
  // sortFilterTransactions,
  sortTransactions2,
} from "../../api/helpers";
import { FaTags, FaWallet } from "react-icons/fa";
import { FaSackDollar } from "react-icons/fa6";
import AddButton from "../Buttons/AddButton";
import EditButton from "../Buttons/EditButton";
import DeleteButton from "../Buttons/DeleteButton";

export interface Transaction {
  id: string;
  name: string;
  asset_id: string;
  category_id: string;
  source: string;
  asset_from_id: string;
  amount: number;
  currency: string;
  date: Date;
  createdAt: Date;
  type: string;
}

export interface TransactionTableProps {
  transactions: Transaction[];
  assets: Asset[];
  categories: Category[];
  isRecent?: boolean;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  assets,
  categories,
  isRecent = true,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState("");
  const closeForm = () => {
    setShowCreateForm(false);
    setShowEditForm("");
  };

  const filterOptionRef = useRef<HTMLSelectElement>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterOption, setFilterOption] = useState<string>("None");
  const [filterValue, setFilterValue] = useState<string[]>([""]);
  const handleFilter = () => {
    const option = filterOptionRef.current?.value;
    setFilterOption(option as string);
    switch (option) {
      case "Amount":
        setFilterValue(["", ""]);
        break;
      case "Date":
        setFilterValue(["this", "1", "month"]);
        break;
      default:
        setFilterValue([""]);
    }
  };

  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortOptions = ["Name", "Asset", "Category", "Date", "Amount", "Type"];
  const [activeSortOrder, setActiveSortOrder] = useState<
    { value: string; isAscending: boolean }[]
  >([]);

  const addSort = (value: string) => {
    setActiveSortOrder([
      ...activeSortOrder,
      { value: value === "" ? "Name" : "", isAscending: true },
    ]);
  };

  const deleteSort = (ind: number) => {
    setActiveSortOrder(activeSortOrder.filter((x, i) => i !== ind));
  };

  const editSort = (ind: number, value: string, isAscending: boolean) => {
    const newSortOrder = [...activeSortOrder];
    newSortOrder[ind] = { value: value, isAscending: isAscending };
    setActiveSortOrder([...newSortOrder]);
  };

  const tableHeader = ["Name", "Date", "Amount", "Details", ""];
  const sortFilterOptions = [
    "None",
    "Name",
    "Asset",
    "Category",
    "Date",
    "Amount",
    "Type",
  ];

  const processedTransactions = sortTransactions2(
    transactions,
    activeSortOrder
  );

  const renderSortMenu = () => {
    return (
      <div className="sort-filter-container">
        <div className="sort-filter-menu">
          <span>Sort By</span>
          <div className="sort-menu">
            {activeSortOrder.map((d, ind) => {
              return (
                <div className="sort-menu-object" key={ind}>
                  <select
                    className="btn"
                    defaultValue={d.value}
                    onChange={(e) => {
                      editSort(ind, e.target.value, d.isAscending);
                    }}
                  >
                    {sortOptions.map((option, ind) => {
                      return (
                        <option key={ind} value={option}>
                          {option}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    className="btn"
                    value={d.isAscending ? "Ascending" : "Descending"}
                    onChange={(e) => {
                      editSort(ind, d.value, e.target.value === "Ascending");
                    }}
                  >
                    <option value="Ascending">Ascending</option>
                    <option value="Descending">Descending</option>
                  </select>
                  <div
                    className="btn btn-red flex-center"
                    onClick={() => deleteSort(ind)}
                  >
                    <XMarkIcon width={16} />
                  </div>
                </div>
              );
            })}
            <div>
              <div className="sort-menu-button" onClick={() => addSort("")}>
                <div className="flex-center">
                  <PlusIcon width={20} />
                  Add sort
                </div>
              </div>
            </div>
            <div>
              <div
                className="sort-menu-button"
                onClick={() => setActiveSortOrder([])}
              >
                <div className="flex-center">
                  <TrashIcon width={20} />
                  Remove sort
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFilterValueInput = () => {
    switch (filterOption) {
      case "Name":
        return (
          <div className="sort-filter-input">
            <input
              type="text"
              defaultValue={filterValue[0] as string}
              onChange={(e) => setFilterValue([e.target.value])}
              placeholder="Enter Name"
            />
          </div>
        );
      case "Asset":
        return (
          <div className="sort-filter-input">
            <select
              defaultValue={filterValue[0] as string}
              onChange={(e) => setFilterValue([e.target.value])}
            >
              <option value="">
                {filterValue.length === 1 && filterValue[0] === ""
                  ? "Select Asset"
                  : "Remove Filter"}
              </option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>
        );
      case "Category":
        return (
          <div className="sort-filter-input">
            <select
              defaultValue={filterValue[0] as string}
              onChange={(e) => setFilterValue([e.target.value])}
            >
              <option value="">
                {filterValue.length === 1 && filterValue[0] === ""
                  ? "Select Category"
                  : "Remove Filter"}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        );
      case "Type":
        return (
          <div className="sort-filter-input">
            <select
              defaultValue={filterValue[0] as string}
              onChange={(e) => setFilterValue([e.target.value])}
            >
              <option value="">
                {filterValue.length === 1 && filterValue[0] === ""
                  ? "Select Type"
                  : "Remove Filter"}
              </option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        );
      case "Amount":
        return (
          <div className="sort-filter-input">
            <div>
              <span>Min:</span>
              <input
                type="number"
                defaultValue={filterValue[0] as string}
                onChange={(e) =>
                  setFilterValue([e.target.value, filterValue[1]])
                }
                placeholder="Enter Amount"
              />
            </div>
            <div>
              <span>Max:</span>
              <input
                type="number"
                defaultValue={filterValue[1] as string}
                onChange={(e) =>
                  setFilterValue([filterValue[0], e.target.value])
                }
                placeholder="Enter Amount"
              />
            </div>
          </div>
        );
      case "Date":
        return (
          <div className="sort-filter-input">
            <div className="date-input">
              <select
                defaultValue={filterValue[0]}
                onChange={(e) =>
                  setFilterValue([
                    e.target.value,
                    filterValue[1],
                    filterValue[2],
                  ])
                }
              >
                <option value="past">Past</option>
                <option value="this">This</option>
                <option value="next">Next</option>
              </select>
              {(filterValue[0] === "past" || filterValue[0] === "next") && (
                <input
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={filterValue[1]}
                  onChange={(e) => {
                    setFilterValue([
                      filterValue[0],
                      e.target.value,
                      filterValue[2],
                    ]);
                  }}
                />
              )}
              <select
                defaultValue={filterValue[2]}
                onChange={(e) =>
                  setFilterValue([
                    filterValue[0],
                    filterValue[1],
                    e.target.value,
                  ])
                }
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="transactions">
      <div className="header">
        <h2>{isRecent && "Recent"} Transactions</h2>
        <div className="btns">
          <AddButton
            handleClick={() => {
              if (assets.length === 0 && categories.length === 0) {
                alert(
                  "No assets and categories available. Please add them first."
                );
                return;
              }
              if (assets.length === 0) {
                alert("No assets available. Please add an asset first.");
                return;
              }
              if (categories.length === 0) {
                alert("No categories available. Please add a category first.");
                return;
              }
              setShowCreateForm(true);
            }}
          />

          {!isRecent && (
            <button
              className={
                showSortMenu ? "btn btn-medium color-yellow" : "btn btn-medium"
              }
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                setShowFilterMenu(false);
              }}
            >
              <ArrowsUpDownIcon width={20} />
            </button>
          )}

          {!isRecent && (
            <button
              className={
                showFilterMenu
                  ? "btn btn-medium color-yellow"
                  : "btn btn-medium"
              }
              onClick={() => {
                setShowFilterMenu(!showFilterMenu);
                setShowSortMenu(false);
              }}
            >
              <FunnelIcon width={20} />
            </button>
          )}

          {showSortMenu && renderSortMenu()}

          {showFilterMenu && (
            <div className="sort-filter-container">
              <div className="sort-filter-menu">
                <span>Filter By</span>
                <div className="sort-filter-options">
                  <select
                    size={sortFilterOptions.length}
                    ref={filterOptionRef}
                    defaultValue={filterOption}
                    onChange={() => handleFilter()}
                  >
                    {sortFilterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {renderFilterValueInput()}
              </div>
            </div>
          )}
        </div>
      </div>

      <table>
        <thead>
          <tr style={{ borderBottom: "1px solid #888" }}>
            {tableHeader.map((t, index) => (
              <th key={index}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processedTransactions.map((transaction, index) => {
            const assetName =
              getAllMatchingItems("assets", "id", transaction.asset_id)[0]
                ?.name ?? "";
            const categoryName =
              getAllMatchingItems(
                "categories",
                "id",
                transaction.category_id
              )[0]?.name ?? "";
            const assetFromName =
              getAllMatchingItems("assets", "id", transaction.asset_from_id)[0]
                ?.name ?? "";
            const source = transaction.source;

            return (
              <tr key={index}>
                <td>{transaction.name}</td>
                <td>{formatDate(transaction.date)}</td>
                <td>
                  {transaction.type === "income" && (
                    <div className="flex-center frame color-green">
                      {"+ " +
                        formatCurrency(
                          transaction.amount,
                          transaction.currency
                        )}
                    </div>
                  )}
                  {transaction.type === "expense" && (
                    <div className="flex-center frame color-red">
                      {"- " +
                        formatCurrency(
                          transaction.amount,
                          transaction.currency
                        )}
                    </div>
                  )}
                  {transaction.type === "transfer" && (
                    <div className="flex-center frame color-yellow">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </div>
                  )}
                </td>
                <td>
                  {transaction.type === "expense" && (
                    <div className="transaction-details">
                      <div className="flex-center frame color-blue">
                        <FaWallet width={15} />
                        {assetName}
                      </div>
                      <ArrowLongRightIcon width={20} />
                      <div className="flex-center frame color-blue">
                        <FaTags width={15} />
                        {categoryName}
                      </div>
                    </div>
                  )}
                  {transaction.type === "income" && (
                    <div className="transaction-details">
                      <div className="flex-center frame color-blue">
                        <FaSackDollar width={20} />
                        {source}
                      </div>
                      <ArrowLongRightIcon width={20} />
                      <div className="flex-center frame color-blue">
                        <FaWallet width={15} />
                        {assetName}
                      </div>
                    </div>
                  )}
                  {transaction.type === "transfer" && (
                    <div className="transaction-details">
                      <div className="flex-center frame color-blue">
                        <FaWallet width={15} />
                        {assetFromName}
                      </div>
                      <ArrowLongRightIcon width={20} />
                      <div className="flex-center frame color-blue">
                        <FaWallet width={15} />
                        {assetName}
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  <div className="table-btns">
                    <EditButton
                      handleClick={() => setShowEditForm(transaction.id)}
                    />
                    <Form method="post">
                      <input
                        type="hidden"
                        name="_action"
                        value="deleteTransaction"
                      />
                      <input
                        type="hidden"
                        name="transaction_id"
                        value={transaction.id}
                      />
                      <DeleteButton />
                    </Form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showCreateForm && (
        <TransactionForm
          assets={assets}
          categories={categories}
          transaction_id={""}
          onClose={closeForm}
        />
      )}

      {showEditForm !== "" && (
        <TransactionForm
          assets={assets}
          categories={categories}
          transaction_id={showEditForm}
          onClose={closeForm}
        />
      )}
    </div>
  );
};

export default TransactionTable;
