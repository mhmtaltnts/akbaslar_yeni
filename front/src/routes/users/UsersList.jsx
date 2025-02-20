import {
  useDeleteUserMutation,
  useGetUsersQuery,
} from "../../api/usersApiSlice";
import useTitle from "../../utils/hooks/useTitle";
import PulseLoader from "react-spinners/PulseLoader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  Table,
  TableBody,
  TableData,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/table";
import Title from "../../components/title";
import { useEffect } from "react";

const UsersList = () => {
  useTitle("Kullanıcı Listesi");

  const {
    data: users,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useGetUsersQuery("usersList", {
    pollingInterval: 60000,
    refetchOnFocus: true,
    refetchOnMountOrArgChange: true,
  });

  let content;

  if (isLoading) content = <PulseLoader color={"#FFF"} />;

  if (isError) {
    content = (
      <p className="text-red-500 dark:text-red-400 text-sm">
        {error?.data?.message}
      </p>
    );
  }

  if (isSuccess) {
    const { ids } = users;

    const tableContent =
      ids?.length && ids.map((userId) => <User key={userId} userId={userId} />);

    content = (
      <div className="max-w-4xl mx-auto p-6 rounded-2xl">
        <Title>Kullanıcılar Listesi</Title>

        <div className="overflow-x-auto ">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Kullanıcı Adı</TableHeader>
                <TableHeader>Görevi</TableHeader>
                <TableHeader>Düzenle</TableHeader>
                <TableHeader>Sil</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>{tableContent}</TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return content;
};

const User = ({ userId }) => {
  const { user } = useGetUsersQuery("usersList", {
    selectFromResult: ({ data }) => ({
      user: data?.entities[userId],
    }),
  });

  const navigate = useNavigate();
  const [
    deleteUser,
    { isSuccess: isDelSuccess, isError: isDelError, error: delerror },
  ] = useDeleteUserMutation();

  useEffect(() => {
    if (isDelSuccess) {
      navigate("/dash/users");
    }
  }, [isDelSuccess, navigate]);

  const errClass = isDelError
    ? "text-red-500 dark:text-red-400 text-sm"
    : "hidden";

  const errContent = delerror?.data?.message ?? "";

  if (user) {
    const handleEdit = () => navigate(`/dash/users/${userId}`);
    const onDeleteUserClicked = async () => {
      if (
        window.confirm(`${user.fullName} Kullanıcıyı silmek istiyor musunuz?`)
      ) {
        await deleteUser({ id: user.id });
      } else return;
    };

    const userRolesString = user.roles.toString().replaceAll(",", ", ");

    const cellStatus = user.active ? "" : "text-gray-400 dark:text-gray-500";

    return (
      <TableRow>
        <TableData className={`${cellStatus}`}>{user.fullName}</TableData>
        <TableData className={`${cellStatus}`}>{userRolesString}</TableData>
        <TableData>
          <p className={errClass}>{errContent}</p>
          <button
            className="bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
            onClick={handleEdit}
          >
            <FontAwesomeIcon icon={faPenToSquare} className="w-6 h-6" />
          </button>
        </TableData>
        <TableData>
          <button
            className="p-2 bg-transparent text-kirmizi rounded  hover:text-gray-300 hover:bg-kirmizi dark:bg-transparent "
            title="Delete"
            onClick={onDeleteUserClicked}
          >
            <FontAwesomeIcon icon={faTrashCan} className="w-6 h-6" />
          </button>
        </TableData>
      </TableRow>
    );
  } else return null;
};

User.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default UsersList;
