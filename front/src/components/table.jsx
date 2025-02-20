import PropTypes from "prop-types";
import { cn } from "../lib/utils";

const Table = ({ children, className }) => {
  return (
    <table
      className={cn(
        "table-auto w-full border-collapse border-1 border-gray-300 dark:bg-gray-800 dark:border-gray-600 ",
        className
      )}
    >
      {children}
    </table>
  );
};

const TableHead = ({ children, className }) => {
  return (
    <thead
      className={cn("bg-gray-100 dark:bg-gray-700 rounded-3xl", className)}
    >
      {children}
    </thead>
  );
};

const TableBody = ({ children, className }) => {
  return (
    <tbody
      className={cn("divide-y divide-gray-300 dark:divide-gray-600", className)}
    >
      {children}
    </tbody>
  );
};

const TableRow = ({ children, className }) => {
  return (
    <tr
      className={cn(
        "hover:bg-gray-300 dark:hover:bg-gray-900 odd:bg-mygray-100 even:bg-mygray-200 dark:odd:bg-gray-700 dark:even:bg-gray-600",
        className
      )}
    >
      {children}
    </tr>
  );
};

const TableHeader = ({ children, className }) => {
  return (
    <th
      className={cn(
        "p-1 md:px-2 md:py-3 w-auto text-center text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600",
        className
      )}
    >
      {children}
    </th>
  );
};

const TableData = ({ children, className }) => {
  return (
    <td
      className={cn(
        "w-auto text-center p-0 md:px-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600",
        className
      )}
    >
      {children}
    </td>
  );
};

// PropTypes for validation
Table.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
TableHead.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
TableBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
TableRow.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
TableHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
TableData.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};

// Export components
export { Table, TableHead, TableBody, TableRow, TableHeader, TableData };
