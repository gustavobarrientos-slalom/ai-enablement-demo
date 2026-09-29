import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowLeft,
  faBed,
  faBoxArchive,
  faBoxOpen,
  faCalendarDay,
  faCar,
  faCircleCheck,
  faCircleInfo,
  faCircleHalfStroke,
  faCoins,
  faMartiniGlass,
  faPen,
  faPlus,
  faReceipt,
  faShareFromSquare,
  faMoon,
  faSun,
  faTag,
  faTicket,
  faTrash,
  faTriangleExclamation,
  faUserPlus,
  faUsers,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { Category } from '../domain/types';

// Font Awesome Free only: no other icon library is used in this project.
library.add(
  faUserPlus,
  faTrash,
  faUsers,
  faCircleInfo,
  faCircleHalfStroke,
  faReceipt,
  faPen,
  faCircleCheck,
  faCoins,
  faTriangleExclamation,
  faArrowLeft,
  faBoxArchive,
  faBoxOpen,
  faCalendarDay,
  faPlus,
  faShareFromSquare,
  faUtensils,
  faMartiniGlass,
  faMoon,
  faCar,
  faBed,
  faTicket,
  faTag,
);

/**
 * The only place a category is tied to a presentation concern, so the domain
 * stays free of icons. Font Awesome Free solid icons only.
 */
export const CATEGORY_ICONS: Record<Category, IconDefinition> = {
  food: faUtensils,
  drinks: faMartiniGlass,
  transport: faCar,
  lodging: faBed,
  entertainment: faTicket,
  other: faTag,
};

export {
  faArrowLeft,
  faBed,
  faBoxArchive,
  faBoxOpen,
  faCalendarDay,
  faCar,
  faCircleCheck,
  faCircleHalfStroke,
  faCircleInfo,
  faCoins,
  faMartiniGlass,
  faMoon,
  faPen,
  faPlus,
  faReceipt,
  faShareFromSquare,
  faSun,
  faTag,
  faTicket,
  faTrash,
  faTriangleExclamation,
  faUserPlus,
  faUsers,
  faUtensils,
};
