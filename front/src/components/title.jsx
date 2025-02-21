import PropTypes from "prop-types";
import { cn } from "../lib/utils";
const Title = ({
  children,

  className = "",
}) => {
  return (
    <h1
      className={cn(
        "mb-4 p-2 text-center text-xl font-bold text-gray-900 dark:text-gray-200 md:text-2xl",
        className,
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
