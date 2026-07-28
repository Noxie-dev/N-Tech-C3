import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import projectsRouter from "./projects";
import storiesRouter from "./stories";
import campaignsRouter from "./campaigns";
import evidenceRouter from "./evidence";
import assetsRouter from "./assets";
import knowledgeRouter from "./knowledge";
import templatesRouter from "./templates";
import searchRouter from "./search";
import workspacesRouter from "./workspaces";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(projectsRouter);
router.use(storiesRouter);
router.use(campaignsRouter);
router.use(evidenceRouter);
router.use(assetsRouter);
router.use(knowledgeRouter);
router.use(templatesRouter);
router.use(searchRouter);
router.use(workspacesRouter);

export default router;
