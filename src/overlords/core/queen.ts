import {CreepSetup} from '../../creepSetups/CreepSetup';
import {Roles, Setups} from '../../creepSetups/setups';
import {Hatchery} from '../../hiveClusters/hatchery';
import {OverlordPriority} from '../../priorities/priorities_overlords';
import {profile} from '../../profiler/decorator';
import {Tasks} from '../../tasks/Tasks';
import {Zerg} from '../../zerg/Zerg';
import {DEFAULT_PRESPAWN, Overlord} from '../Overlord';

/**
 * Spawns a dedicated hatchery attendant to refill spawns and extensions
 */
@profile
export class QueenOverlord extends Overlord {

	hatchery: Hatchery;
	queenSetup: CreepSetup;
	queens: Zerg[];
	settings: any;

	constructor(hatchery: Hatchery, priority = OverlordPriority.core.queen) {
		super(hatchery, 'queen', priority);
		this.hatchery = hatchery;
		this.queenSetup = this.colony.storage && !this.colony.state.isRebuilding ? Setups.queens.default
																				 : Setups.queens.early;
		this.queens = this.zerg(Roles.queen);
		this.settings = {
			refillTowersBelow: 500,
		};
	}

	init() {
		const amount = 1;
		const prespawn = this.hatchery.spawns.length <= 1 ? 100 : DEFAULT_PRESPAWN;
		this.wishlist(amount, this.queenSetup, {prespawn: prespawn});
	}

	private supplyActions(queen: Zerg) {
		// Select the closest supply target out of the highest priority and refill it
		const request = this.hatchery.transportRequests.getPrioritizedClosestRequest(queen.pos, 'supply');
		if (request) {
			this.debug(`${queen.print} transferring from ${request.target.structureType}@${request.target.pos}`)
			queen.task = Tasks.transfer(request.target);
		} else {
			this.rechargeActions(queen); // if there are no targets, refill yourself
		}
	}

	private rechargeActions(queen: Zerg): void {
		if (this.hatchery.link && !this.hatchery.link.isEmpty) {
			this.debug(`${queen.print} recharging from link`);
			queen.task = Tasks.withdraw(this.hatchery.link);
		} else if (this.hatchery.battery && this.hatchery.battery.energy > 0) {
			this.debug(`${queen.print} recharging from battery`);
			queen.task = Tasks.withdraw(this.hatchery.battery);
		} else {
			this.debug(`${queen.print} recharging`);
			queen.task = Tasks.recharge();
		}
	}

	private idleActions(queen: Zerg): void {
		if (this.hatchery.link) {
			// Can energy be moved from the link to the battery?
			if (this.hatchery.battery && !this.hatchery.battery.isFull && !this.hatchery.link.isEmpty) {
				// Move energy to battery as needed
				if (queen.store.energy < queen.store.getCapacity()) {
					queen.task = Tasks.withdraw(this.hatchery.link);
				} else {
					queen.task = Tasks.transfer(this.hatchery.battery);
				}
			} else {
				if (queen.store.energy < queen.store.getCapacity()) { // make sure you're recharged
					if (!this.hatchery.link.isEmpty) {
						queen.task = Tasks.withdraw(this.hatchery.link);
					} else if (this.hatchery.battery && !this.hatchery.battery.isEmpty) {
						queen.task = Tasks.withdraw(this.hatchery.battery);
					}
				}
			}
		} else {
			if (this.hatchery.battery && queen.store.energy < queen.store.getCapacity()) {
				queen.task = Tasks.withdraw(this.hatchery.battery);
			}
		}
	}

	private handleQueen(queen: Zerg): void {
		if (queen.store.energy > 0) {
			this.supplyActions(queen);
		} else {
			this.rechargeActions(queen);
		}
		this.debug(`${queen.print}: isIdle? ${queen.isIdle}, ${queen.task ? queen.task.name : null}`);
		// If there aren't any tasks that need to be done, recharge the battery from link
		if (queen.isIdle) {
			this.idleActions(queen);
		}
		// If all of the above is done and hatchery is not in emergencyMode, move to the idle point and renew as needed
		// if (!this.emergencyMode && queen.isIdle) {
		// 	if (queen.pos.isEqualTo(this.idlePos)) {
		// 		// If queen is at idle position, renew her as needed
		// 		if (queen.ticksToLive < this.settings.renewQueenAt && this.availableSpawns.length > 0) {
		// 			this.availableSpawns[0].renewCreep(queen.creep);
		// 		}
		// 	} else {
		// 		// Otherwise, travel back to idle position
		// 		queen.goTo(this.idlePos);
		// 	}
		// }
	}

	run() {
		for (const queen of this.queens) {
			// Get a task
			this.handleQueen(queen);
			// Run the task if you have one; else move back to idle pos
			if (queen.hasValidTask) {
				queen.run();
			} else {
				this.debug(`${queen.print} going back to idling`);
				if (this.queens.length > 1) {
					queen.goTo(this.hatchery.idlePos, {range: 1});
				} else {
					queen.goTo(this.hatchery.idlePos);
				}
			}
		}
	}
}
