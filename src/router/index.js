import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import TelescopeDetailsView from "@/views/TelescopeDetailsView.vue";
import InstrumentDetailsView from "@/views/InstrumentDetailsView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/about",
      name: "about",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import("../views/AboutView.vue"),
    },
    {
      path: "/visibility",
      name: "visibility",
      component: () => import("../views/VisibilityView.vue"),
    },
    {
      path: "/instruments",
      name: "instruments",
      component: () => import("../views/InstrumentsView.vue"),
    },
    {
      path: '/instruments/:id',
      name: 'instrumentDetail',
      component: InstrumentDetailsView,
      meta: {
        title: 'Instrument Detail'
      }
    },
    {
      path: "/telescopes",
      name: "telescopes",
      component: () => import("../views/TelescopesView.vue"),
    },
    {
      path: '/telescopes/:id',
      name: 'telescopeDetail',
      component: TelescopeDetailsView,
      meta: {
        title: 'Telescope Detail'
      }
    },
  ],
});

export default router;
