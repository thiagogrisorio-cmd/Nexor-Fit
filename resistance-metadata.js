/** Exercise metadata used to estimate work, not a physiological recovery score. */
export const patternMuscles={
 squat:['Quadríceps','Glúteos'],lunge:['Quadríceps','Glúteos'],hinge:['Posteriores','Glúteos'],bridge:['Glúteos'],
 'knee-extension':['Quadríceps'],'hip-abduction':['Glúteos'],'hip-adduction':['Adutores'],'knee-flexion':['Posteriores'],'push-horizontal':['Peito'],'pull-horizontal':['Costas'],'pull-vertical':['Costas'],'lat-isolation':['Costas'],
 'push-vertical':['Ombros'],'shoulder-lateral':['Ombros'],'shoulder-rear':['Ombros'],'chest-isolation':['Peito'],
 'elbow-flexion':['Bíceps'],'elbow-extension':['Tríceps'],core:['Core'],calves:['Panturrilhas'],scapular:[]
};
export function unilateralExercise(e){return /unilateral|alternad[ao]|por lado|pallof|lateral com joelhos|prancha lateral|deitado de lado|búlgaro|bicicleta|alternada|concentrada|afundo|bird dog|dead bug|elevação lateral na polia/i.test(e.name);}
export function exerciseCategory(e){return ['knee-extension','hip-abduction','hip-adduction','core','calves','scapular','shoulder-lateral','shoulder-rear','chest-isolation','knee-flexion','elbow-flexion','elbow-extension','lat-isolation','bridge'].includes(e.pattern)?'accessory':'compound';}
