import { useParams } from "react-router-dom";
import { useGetUsersQuery } from "../../api/usersApiSlice";
import PulseLoader from "react-spinners/PulseLoader";
import useTitle from "../../utils/hooks/useTitle";
import { useState, useEffect } from "react";
import { useUpdateUserMutation } from "../../api/usersApiSlice";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave } from "@fortawesome/free-solid-svg-icons";
import { ROLES } from "../../utils/config/roles";
import PropTypes from "prop-types";
import Title from "../../components/title";

const EditUser = () => {
  useTitle("Kullanıcı Düzenle");

  const { id } = useParams();

  const { user } = useGetUsersQuery("usersList", {
    selectFromResult: ({ data }) => ({
      user: data?.entities[id],
    }),
  });

  if (!user) return <PulseLoader color={"#FFF"} />;

  const content = <EditUserForm user={user} />;

  return content;
};

const EditUserForm = ({ user }) => {
  const [updateUser, { isLoading, isSuccess, isError, error }] =
    useUpdateUserMutation();

  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user.fullName);
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState(user.roles);
  const [active, setActive] = useState(user.active);

  useEffect(() => {
    if (isSuccess) {
      setFullName("");
      setUsername("");
      setPassword("");
      setRoles([]);
      navigate("/dash/users");
    }
  }, [isSuccess, navigate]);

  const onFullNameChanged = (e) => setFullName(e.target.value);
  const onUsernameChanged = (e) => setUsername(e.target.value);
  const onPasswordChanged = (e) => setPassword(e.target.value);

  const onRolesChanged = (e) => {
    const values = Array.from(
      e.target.selectedOptions,
      (option) => option.value,
    );
    setRoles(values);
  };

  const onActiveChanged = () => setActive((prev) => !prev);

  const onSaveUserClicked = async () => {
    if (password) {
      await updateUser({
        id: user.id,
        fullName,
        username,
        password,
        roles,
        active,
      });
    } else {
      await updateUser({ id: user.id, fullName, username, roles, active });
    }
  };

  const options = Object.values(ROLES).map((role) => {
    return (
      <option key={role} value={role}>
        {role}
      </option>
    );
  });

  const canSave = [roles.length].every(Boolean) && !isLoading;

  const errClass = isError
    ? "text-red-500 dark:text-red-400 text-sm"
    : "hidden";
  const validRolesClass = !roles.length ? "border-red-500" : "";

  const errContent = error?.data?.message ?? "";

  const content = (
    <div className="mx-auto w-full max-w-xl p-6">
      <p className={errClass}>{errContent}</p>
      <Title className="text-2xl font-semibold text-gray-800 dark:text-white">
        Kullanıcı Değiştir
      </Title>

      <form
        onSubmit={(e) => e.preventDefault()}
        autoComplete="off"
        className="space-y-4"
      >
        {/* Full Name */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="fullname"
          >
            Adı Soyadı
          </label>
          <input
            className="mt-1 block w-full rounded-md border border-gray-300 bg-amber-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            id="fullname"
            name="fullname"
            type="text"
            autoComplete="off"
            value={fullName}
            placeholder="Adı ve Soyadı"
            onChange={onFullNameChanged}
            autoFocus
          />
        </div>

        {/* Username */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="username"
          >
            Kullanıcı Adı
          </label>
          <input
            className="mt-1 block w-full rounded-md border border-gray-300 bg-amber-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            id="username"
            name="username"
            type="text"
            autoComplete="off"
            value={username}
            onChange={onUsernameChanged}
          />
        </div>

        {/* Password */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="password"
          >
            Şifre
          </label>
          <input
            className="mt-1 block w-full rounded-md border border-gray-300 bg-amber-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            id="password"
            name="password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={onPasswordChanged}
          />
        </div>

        {/* Active Checkbox */}
        <div className="flex items-center">
          <input
            className="mr-2 rounded border border-gray-300 bg-amber-50 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            id="user-active"
            name="user-active"
            type="checkbox"
            checked={active}
            onChange={onActiveChanged}
          />
          <label
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="user-active"
          >
            Aktif Çalışan?
          </label>
        </div>

        {/* Roles Dropdown */}
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="roles"
          >
            Roller:
          </label>
          <select
            id="roles"
            name="roles"
            className={`mt-1 block w-full rounded-md border border-gray-300 bg-amber-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white ${validRolesClass}`}
            multiple={true}
            size="4"
            value={roles}
            onChange={onRolesChanged}
          >
            {options}
          </select>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <button
            className="flex-1 rounded bg-yesil p-2 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
            title="Save"
            onClick={onSaveUserClicked}
            disabled={!canSave}
          >
            <FontAwesomeIcon icon={faSave} /> Kaydet
          </button>
        </div>
      </form>
    </div>
  );

  return content;
};

EditUserForm.propTypes = {
  user: PropTypes.object.isRequired,
};

export default EditUser;
