import { Zerg } from "zerg/Zerg";
import { profile } from "../../profiler/decorator";
import { Task } from "../Task";

export type getRenewedTargetType = StructureSpawn;
export const getRenewedTaskName = "getRenewed";

@profile
export class TaskGetRenewed extends Task<Zerg, getRenewedTargetType> {
	constructor(target: getRenewedTargetType, options: TaskOptions = {}) {
		super(getRenewedTaskName, target, options);
	}

	isValidTask() {
		const hasClaimPart =
			_.filter(
				this.creep.body,
				(part: BodyPartDefinition) => part.type == CLAIM
			).length > 0;
		const lifetime = hasClaimPart ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
		return (
			this.creep.ticksToLive != undefined &&
			this.creep.ticksToLive < 0.9 * lifetime
		);
	}

	isValidTarget() {
		return this.target.my && !this.target.spawning;
	}

	work() {
		return this.target.renewCreep(this.creep.creep);
	}
}
