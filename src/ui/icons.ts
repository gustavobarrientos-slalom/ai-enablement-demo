import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faCircleInfo,
  faPen,
  faReceipt,
  faTrash,
  faUserPlus,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

// Font Awesome Free only: no other icon library is used in this project.
library.add(faUserPlus, faTrash, faUsers, faCircleInfo, faReceipt, faPen);

export { faCircleInfo, faPen, faReceipt, faTrash, faUserPlus, faUsers };
