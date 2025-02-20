import PropTypes from "prop-types";
import { cn } from "../lib/utils";
const Title = ({
  children,

  className = "",
}) => {
  return (
    <h1
      className={cn(
        "text-2xl font-bold text-center text-gray-900 dark:text-gray-200 p-2 mb-4",
        className
      )}
    >
      {children}
    </h1>
  );
};

Title.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Title;
