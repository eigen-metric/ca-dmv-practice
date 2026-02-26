import fs from 'node:fs';
import path from 'node:path';

const categories = {
  RightOfWay: {
    ref: 'Right-of-way rules',
    concepts: [
      {
        concept: '4-way stop tie-breaker',
        rule: 'At a 4-way stop, the first vehicle to stop goes first. If two vehicles arrive together, the one on the right goes first.',
        prompts: [
          'You and another driver stop at a 4-way stop at the same time. The other vehicle is on your left. What should you do?',
          'At a 4-way stop, you and a driver to your left arrive and stop together. Who has the right-of-way?',
          'You reach a stop-controlled intersection at the same time as a car on your left. What is the safest legal choice?'
        ],
        correct: 'Proceed first after checking the intersection',
        distractors: [
          'Yield to the vehicle on your left',
          'Wave the other driver through and go without checking',
          'Accelerate quickly to claim the intersection'
        ]
      },
      {
        concept: 'uncontrolled intersection',
        rule: 'At an intersection without signs or signals, you must yield to vehicles already in the intersection and to vehicles on your right.',
        prompts: [
          'At an intersection with no signs or lights, a vehicle approaches from your right. What must you do?',
          'You enter an uncontrolled intersection and notice a car to your right arriving at the same time. What is correct?',
          'No signs are posted at the intersection. A driver comes from your right as you approach. What should happen first?'
        ],
        correct: 'Yield and let the vehicle on your right go first',
        distractors: [
          'Go first because you are traveling straight',
          'Speed up to pass before the other driver',
          'Stop in the intersection and block cross traffic'
        ]
      },
      {
        concept: 'left turn across traffic',
        rule: 'A left-turning driver must yield to oncoming traffic that is close enough to be a hazard.',
        prompts: [
          'You plan to turn left at a green light with no arrow. Oncoming vehicles are approaching. What should you do?',
          'At an intersection, you are turning left while an oncoming car is close. What is required?',
          'You have a steady green signal and want to turn left across opposite traffic. What comes first?'
        ],
        correct: 'Yield to oncoming traffic and turn when safe',
        distractors: [
          'Turn immediately because green means full right-of-way',
          'Move halfway and force oncoming cars to brake',
          'Use your horn to claim priority'
        ]
      },
      {
        concept: 'pedestrian crosswalk priority',
        rule: 'Drivers must yield to pedestrians in marked or unmarked crosswalks.',
        prompts: [
          'A pedestrian steps into a crosswalk ahead of your lane. What is the legal response?',
          'You approach an intersection and see a person crossing in a crosswalk. What must you do?',
          'At a crosswalk, a pedestrian starts walking before your turn. What should you do first?'
        ],
        correct: 'Yield and wait until the pedestrian is safely clear',
        distractors: [
          'Proceed if your lane still has room',
          'Pass behind the pedestrian without stopping',
          'Honk so the pedestrian crosses faster'
        ]
      },
      {
        concept: 'emergency vehicle',
        rule: 'When an emergency vehicle with siren and lights is approaching, pull to the right edge and stop until it passes when safe.',
        prompts: [
          'You hear a siren and see flashing lights approaching from behind. What should you do?',
          'An ambulance with lights and siren is coming up behind your car. What is the correct action?',
          'A fire engine is approaching with emergency signals on. How should you respond?'
        ],
        correct: 'Move right and stop until the emergency vehicle passes',
        distractors: [
          'Maintain speed so traffic flow is not interrupted',
          'Brake in your lane without moving right',
          'Turn left at the next intersection regardless of traffic'
        ]
      }
    ]
  },
  SignsSignalsMarkings: {
    ref: 'Signs, signals, and pavement markings',
    concepts: [
      {
        concept: 'solid yellow line',
        rule: 'A solid yellow centerline generally means no passing from your side.',
        prompts: [
          'You are behind a slow vehicle and see a solid yellow centerline on your side. What does it mean?',
          'A solid yellow line is next to your lane in a two-way road. What is the passing rule?',
          'On a two-lane road, your side has a solid yellow centerline. What should you do?'
        ],
        correct: 'Do not pass from your lane',
        distractors: [
          'Pass only if you can complete it quickly',
          'Pass if the vehicle ahead is under the speed limit',
          'Use the shoulder to pass carefully'
        ]
      },
      {
        concept: 'flashing red signal',
        rule: 'A flashing red traffic signal is treated like a stop sign.',
        prompts: [
          'You approach a flashing red traffic signal. What is required?',
          'At a flashing red light, how should you proceed?',
          'A traffic light is flashing red in your direction. What is the legal action?'
        ],
        correct: 'Come to a complete stop and proceed when safe',
        distractors: [
          'Slow down and continue without stopping',
          'Treat it like a yield sign',
          'Proceed if cross traffic is far away'
        ]
      },
      {
        concept: 'school zone sign',
        rule: 'School area signs warn drivers to reduce speed and watch for children.',
        prompts: [
          'You enter a signed school zone while children are nearby. What should you do?',
          'A school warning sign appears ahead. Which driving behavior is best?',
          'In a school area, what is your primary responsibility?'
        ],
        correct: 'Slow down and watch carefully for children',
        distractors: [
          'Maintain your usual speed if lanes are clear',
          'Pass slower vehicles to clear the zone quickly',
          'Use your horn continuously while driving through'
        ]
      },
      {
        concept: 'lane control arrows',
        rule: 'Lane-use arrows show required direction from that lane.',
        prompts: [
          'Your lane has a painted left-turn-only arrow. What does it require?',
          'You are in a lane marked with a straight-and-right arrow. What turns are allowed?',
          'A lane-use arrow indicates left turn only. How should you proceed?'
        ],
        correct: 'Follow the arrow and make only the indicated movement',
        distractors: [
          'Choose any movement if traffic is light',
          'Go straight if you signal early',
          'Change movement after entering the intersection'
        ]
      },
      {
        concept: 'stop line and crosswalk',
        rule: 'At a stop sign, stop before the crosswalk or limit line and yield before proceeding.',
        prompts: [
          'At a stop sign with a marked crosswalk, where should you stop first?',
          'You approach a stop sign and see a stop line before a crosswalk. What is correct?',
          'Where should your wheels stop at a signed intersection with crosswalk markings?'
        ],
        correct: 'At the limit line or before the crosswalk',
        distractors: [
          'Past the crosswalk to improve your view',
          'Only if cross traffic is present',
          'In the center of the intersection'
        ]
      }
    ]
  },
  SpeedAndFollowingDistance: {
    ref: 'Speed limits and following distance',
    concepts: [
      {
        concept: 'basic speed law',
        rule: 'You must drive at a speed that is safe for current conditions, even below posted limits.',
        prompts: [
          'The posted limit is 45 mph, but heavy rain reduces visibility. What speed choice is legal?',
          'On a wet road with limited traction, how should you set your speed?',
          'If fog makes it hard to see ahead, what does the basic speed rule require?'
        ],
        correct: 'Drive slower than the posted limit as needed for safety',
        distractors: [
          'Drive exactly the posted limit to avoid impeding traffic',
          'Match the speed of the fastest vehicle',
          'Maintain speed and increase following distance only'
        ]
      },
      {
        concept: 'three-second rule',
        rule: 'Maintain at least a three-second gap in normal conditions, more in poor conditions.',
        prompts: [
          'In normal daylight traffic, what is a minimum safe following gap?',
          'You are following another vehicle on a dry road. What gap should you keep?',
          'What is the recommended baseline following distance in good conditions?'
        ],
        correct: 'At least three seconds',
        distractors: [
          'One second',
          'Two car lengths at any speed',
          'Half a second if traffic is smooth'
        ]
      },
      {
        concept: 'tailgater behind you',
        rule: 'If someone tailgates, increase space ahead and let them pass when safe.',
        prompts: [
          'A driver is following you too closely. What is the best response?',
          'You are being tailgated on a two-lane road. What should you do?',
          'When a vehicle crowds your rear bumper, what reduces risk most?'
        ],
        correct: 'Create more room ahead and allow the tailgater to pass',
        distractors: [
          'Brake suddenly to warn the tailgater',
          'Speed up above the limit to escape',
          'Move to the centerline to block passing'
        ]
      },
      {
        concept: 'stopping distance at speed',
        rule: 'Higher speed greatly increases stopping distance.',
        prompts: [
          'As your speed doubles on a dry road, what happens to stopping distance?',
          'Driving faster mainly changes stopping distance in what way?',
          'At highway speed, why should you leave a larger gap ahead?'
        ],
        correct: 'Stopping distance increases significantly',
        distractors: [
          'Stopping distance stays about the same with modern brakes',
          'Only reaction time changes, not stopping distance',
          'Stopping distance decreases because tires are warmer'
        ]
      },
      {
        concept: 'hill and curve speed control',
        rule: 'Reduce speed before entering curves and before cresting hills with limited sight distance.',
        prompts: [
          'You approach a blind curve. When should you reduce speed?',
          'On a hill crest with limited view ahead, what is safest?',
          'Before entering a sharp curve, what is the correct speed strategy?'
        ],
        correct: 'Slow down before the curve or hill crest',
        distractors: [
          'Brake hard mid-curve only if needed',
          'Accelerate through the curve for stability',
          'Keep speed and rely on lane markings'
        ]
      }
    ]
  },
  LaneUseAndTurns: {
    ref: 'Lane use and turning maneuvers',
    concepts: [
      {
        concept: 'turn signaling timing',
        rule: 'Signal continuously for at least the last 100 feet before turning.',
        prompts: [
          'Before turning at an intersection in a city area, when should you signal?',
          'How long before a turn should your signal be on in typical city driving?',
          'You plan to turn right at the next corner. What signal timing is expected?'
        ],
        correct: 'Signal at least 100 feet before the turn',
        distractors: [
          'Signal only as you start turning',
          'Signal 20 feet before the corner',
          'Use hazard lights instead of turn signals'
        ]
      },
      {
        concept: 'right turn position',
        rule: 'A right turn should start and end as close as practicable to the right curb or edge.',
        prompts: [
          'You are preparing for a right turn. Which lane position is correct?',
          'For a standard right turn, where should your vehicle be before turning?',
          'When making a right turn, you should normally enter which lane?'
        ],
        correct: 'From near the right edge into the nearest right lane',
        distractors: [
          'From any lane into the center lane',
          'From the middle lane if you signal long enough',
          'From the shoulder if traffic is heavy'
        ]
      },
      {
        concept: 'left turn from two-way to two-way',
        rule: 'Approach a left turn from the lane closest to center and enter the lane just right of centerline in your direction.',
        prompts: [
          'Turning left from a two-way street onto another two-way street, where should you begin?',
          'For a standard left turn between two two-way roads, what lane path is best?',
          'Which lane choice is correct for a left turn from regular city streets?'
        ],
        correct: 'Start near the centerline and enter the appropriate lane',
        distractors: [
          'Start from the right lane for wider turning space',
          'Swing wide into any open lane',
          'Cut across all lanes to clear quickly'
        ]
      },
      {
        concept: 'lane change blind spots',
        rule: 'Check mirrors and blind spots before every lane change.',
        prompts: [
          'Before changing lanes on a multilane road, what is essential?',
          'What should you do just before moving into another lane?',
          'A quick mirror glance is not enough before a lane change because you should also:'
        ],
        correct: 'Check mirrors, signal, and check blind spots',
        distractors: [
          'Signal while changing and skip head checks',
          'Rely on blind spot monitors only',
          'Move first, then verify space'
        ]
      },
      {
        concept: 'u-turn safety',
        rule: 'U-turns are legal only where permitted and when they can be made safely without interfering with traffic.',
        prompts: [
          'You want to make a U-turn in a business district. What must be true first?',
          'When is a U-turn acceptable?',
          'What is the key rule before beginning a U-turn?'
        ],
        correct: 'It must be legal there and safe without disrupting traffic',
        distractors: [
          'It is always allowed if no officer is present',
          'It is allowed whenever your signal is on',
          'It is allowed only at green arrows'
        ]
      }
    ]
  },
  Parking: {
    ref: 'Parking rules and curb use',
    concepts: [
      {
        concept: 'uphill with curb',
        rule: 'When parked uphill next to a curb, turn front wheels away from the curb.',
        prompts: [
          'You park uphill on a street with a curb. Which way should front wheels point?',
          'For uphill parking with a curb, wheel position should be:',
          'What is correct wheel direction when parked uphill beside a curb?'
        ],
        correct: 'Away from the curb',
        distractors: [
          'Toward the curb',
          'Straight ahead',
          'Direction does not matter with parking brake on'
        ]
      },
      {
        concept: 'downhill with curb',
        rule: 'When parked downhill with a curb, turn front wheels toward the curb.',
        prompts: [
          'You park downhill on a hill with a curb. How should wheels be turned?',
          'For downhill parking next to a curb, choose wheel direction:',
          'Which wheel position helps prevent rolling downhill when parked by a curb?'
        ],
        correct: 'Toward the curb',
        distractors: [
          'Away from the curb',
          'Straight ahead',
          'Slightly toward traffic'
        ]
      },
      {
        concept: 'fire hydrant distance',
        rule: 'Do not park within 15 feet of a fire hydrant unless specific legal exceptions apply.',
        prompts: [
          'How close may you park to a fire hydrant in most situations?',
          'You find curb space near a hydrant. What distance rule applies?',
          'Parking next to a fire hydrant is illegal within how many feet?'
        ],
        correct: 'Within 15 feet is not allowed',
        distractors: [
          'Within 5 feet is not allowed',
          'Within 20 feet is not allowed',
          'Any distance is allowed if hazards are on'
        ]
      },
      {
        concept: 'red curb meaning',
        rule: 'Red curb means no stopping, standing, or parking.',
        prompts: [
          'What does a red-painted curb indicate?',
          'You see a red curb along the street. What is the rule?',
          'Stopping at a red curb is generally:'
        ],
        correct: 'Not allowed for stopping or parking',
        distractors: [
          'Allowed for short passenger loading',
          'Allowed for disabled placard holders only',
          'Allowed if you stay in the vehicle'
        ]
      },
      {
        concept: 'parallel parking distance',
        rule: 'When parallel parked, your wheels should be within 18 inches of the curb.',
        prompts: [
          'When parallel parking on a street, how close should your vehicle be to the curb?',
          'A properly parallel-parked car should be within what distance of the curb?',
          'What curb distance is expected for parallel parking?'
        ],
        correct: 'Within 18 inches of the curb',
        distractors: [
          'Within 3 feet of the curb',
          'Within 6 inches only',
          'Distance is not specified if centered in the space'
        ]
      }
    ]
  },
  FreewayDriving: {
    ref: 'Freeway driving and merging',
    concepts: [
      {
        concept: 'merge speed',
        rule: 'Use the acceleration lane to reach freeway speed and merge when a gap is available.',
        prompts: [
          'When entering a freeway, what should you do in the acceleration lane?',
          'How should you merge from an on-ramp into freeway traffic?',
          'The safest freeway entry method is to:'
        ],
        correct: 'Match traffic speed and merge into an open gap',
        distractors: [
          'Stop at the end of the ramp and wait',
          'Enter slowly so others can go around you',
          'Merge immediately without checking mirrors'
        ]
      },
      {
        concept: 'freeway following distance',
        rule: 'Keep a larger following gap at freeway speeds.',
        prompts: [
          'At freeway speed, what should happen to your following distance?',
          'Why do drivers need extra space on freeways?',
          'In heavy fast-moving traffic, the safest gap ahead is:'
        ],
        correct: 'Increase following distance for more reaction time',
        distractors: [
          'Keep the same gap as city speeds',
          'Reduce gap to prevent lane changes in front',
          'Use one car length for each 20 mph'
        ]
      },
      {
        concept: 'missed exit',
        rule: 'If you miss your freeway exit, continue to the next exit; do not back up.',
        prompts: [
          'You realize you passed your freeway exit. What should you do?',
          'If you miss your off-ramp, the correct choice is:',
          'After missing your freeway exit, which action is legal and safe?'
        ],
        correct: 'Continue to the next exit',
        distractors: [
          'Back up on the shoulder',
          'Stop in the lane and signal right',
          'Make a U-turn through the median opening'
        ]
      },
      {
        concept: 'shoulder use',
        rule: 'The freeway shoulder is for emergencies, not normal travel.',
        prompts: [
          'When is it acceptable to drive on the freeway shoulder?',
          'The shoulder on a freeway is mainly intended for:',
          'Which statement about shoulder driving is correct?'
        ],
        correct: 'Only for emergencies or when directed',
        distractors: [
          'For passing slow traffic',
          'For regular travel when right lane is crowded',
          'For accelerating before every merge'
        ]
      },
      {
        concept: 'lane choice and passing',
        rule: 'Use left lanes for passing and return to a travel lane when safe.',
        prompts: [
          'On a freeway, you moved left to pass. What should you do after passing?',
          'Which lane behavior supports smooth freeway flow?',
          'After overtaking a slower vehicle on a freeway, the next step is to:'
        ],
        correct: 'Return to an appropriate travel lane when safe',
        distractors: [
          'Stay in the far-left lane at all times',
          'Slow down in the passing lane to block tailgaters',
          'Immediately cut across multiple lanes'
        ]
      }
    ]
  },
  SharingTheRoad: {
    ref: 'Sharing the road with others',
    concepts: [
      {
        concept: 'bicycle passing space',
        rule: 'Provide safe passing space when overtaking bicyclists and change lanes when possible.',
        prompts: [
          'You are passing a bicyclist on a city street. What is the safest approach?',
          'When overtaking a bicycle rider, you should:',
          'A cyclist is ahead near the lane edge. How should you pass?'
        ],
        correct: 'Slow and leave ample space, changing lanes if possible',
        distractors: [
          'Pass closely to avoid crossing lane markings',
          'Honk and pass immediately',
          'Speed up to finish the pass as fast as possible'
        ]
      },
      {
        concept: 'motorcycle visibility',
        rule: 'Motorcycles are smaller and can be harder to judge; check carefully before lane changes and turns.',
        prompts: [
          'Why should drivers double-check for motorcycles before changing lanes?',
          'A motorcycle approaches from behind in your blind area. Best practice is to:',
          'When sharing lanes near motorcycles, drivers should:'
        ],
        correct: 'Use extra mirror and blind-spot checks',
        distractors: [
          'Assume motorcycles can stop faster than cars',
          'Treat motorcycles as if they are bicycles',
          'Signal and move without a head check'
        ]
      },
      {
        concept: 'large truck blind spots',
        rule: 'Trucks have large blind spots to the sides and rear; avoid lingering there.',
        prompts: [
          'Where should you avoid driving near a large truck?',
          'Why is staying beside a truck for long periods risky?',
          'When passing a truck, the best strategy is to:'
        ],
        correct: 'Avoid truck blind spots and pass safely without lingering',
        distractors: [
          'Drive beside the truck to stay visible',
          'Follow closely so the truck driver sees you in mirrors',
          'Pass slowly in the truck’s right blind area'
        ]
      },
      {
        concept: 'pedestrians at intersections',
        rule: 'Drivers must yield to pedestrians crossing at intersections, including unmarked crosswalks.',
        prompts: [
          'A pedestrian begins crossing at an unmarked intersection crosswalk. What must you do?',
          'At intersections, pedestrians generally have what right?',
          'You are turning and a pedestrian is in your path. What comes first?'
        ],
        correct: 'Yield and wait for the pedestrian to clear',
        distractors: [
          'Proceed if your turn signal is on',
          'Edge forward to make the pedestrian stop',
          'Use your horn and continue slowly'
        ]
      },
      {
        concept: 'school bus with flashing lights',
        rule: 'When a school bus is stopped with flashing red lights and stop arm, traffic must stop as required by law.',
        prompts: [
          'You approach a stopped school bus with flashing red lights. What is required?',
          'A school bus is loading children with red signals on. Your response should be:',
          'What should drivers do when a school bus displays flashing red lights?'
        ],
        correct: 'Stop and remain stopped until it is safe and legal to proceed',
        distractors: [
          'Pass slowly if no children are visible',
          'Honk and drive around the bus quickly',
          'Continue if you are running late'
        ]
      }
    ]
  },
  DistractedImpairedDriving: {
    ref: 'Distracted and impaired driving laws',
    concepts: [
      {
        concept: 'phone use while driving',
        rule: 'Drivers should avoid handheld phone use and keep full attention on driving.',
        prompts: [
          'You receive a text while driving in traffic. What is the safest legal choice?',
          'What should you do if your phone alerts while you are driving?',
          'A message appears on your phone while moving. The best response is:'
        ],
        correct: 'Ignore it until you can safely stop',
        distractors: [
          'Read it quickly at a red light',
          'Hold the phone low and text briefly',
          'Answer using speaker while holding the phone'
        ]
      },
      {
        concept: 'alcohol impairment',
        rule: 'Alcohol reduces judgment, reaction time, and coordination even before obvious signs of intoxication.',
        prompts: [
          'How does alcohol affect driving ability?',
          'Even small amounts of alcohol can affect drivers by:',
          'Why is driving after drinking risky even if you feel fine?'
        ],
        correct: 'It impairs judgment and slows reaction time',
        distractors: [
          'It improves focus for short trips',
          'It affects only nighttime vision',
          'It has no effect below freeway speeds'
        ]
      },
      {
        concept: 'drug impairment',
        rule: 'Prescription, over-the-counter, and illegal drugs can impair driving.',
        prompts: [
          'A medicine label warns of drowsiness. What should you do before driving?',
          'How should drivers treat medications that affect alertness?',
          'If a drug can slow reaction time, safe driving requires:'
        ],
        correct: 'Do not drive until you know it is safe',
        distractors: [
          'Drive only on familiar roads',
          'Drink coffee and continue as normal',
          'Drive slower and ignore the warning'
        ]
      },
      {
        concept: 'drowsy driving',
        rule: 'Sleepiness can be as dangerous as impairment; pull over to rest if needed.',
        prompts: [
          'You are yawning repeatedly and missing signs. What should you do?',
          'A driver feels very sleepy on the freeway. Best next step?',
          'When fatigue affects attention, the safe response is to:'
        ],
        correct: 'Exit and rest before continuing',
        distractors: [
          'Open windows and keep driving at same speed',
          'Increase speed to reach destination faster',
          'Follow another car closely to stay alert'
        ]
      },
      {
        concept: 'distraction management',
        rule: 'Set navigation and controls before moving to minimize visual and manual distractions.',
        prompts: [
          'When should you program your navigation device?',
          'How can drivers reduce in-car distraction?',
          'Before starting a trip, what is a good safety habit?'
        ],
        correct: 'Set devices before you begin driving',
        distractors: [
          'Adjust apps during straight freeway sections',
          'Let passengers hold the wheel while you adjust settings',
          'Use one hand to steer while typing directions'
        ]
      }
    ]
  },
  HazardsAndDefensiveDriving: {
    ref: 'Hazard awareness and defensive driving',
    concepts: [
      {
        concept: 'scanning ahead',
        rule: 'Defensive drivers scan 10-15 seconds ahead to spot hazards early.',
        prompts: [
          'How far ahead should you scan in normal traffic?',
          'A key defensive driving habit is to:',
          'To reduce surprise hazards, drivers should look:'
        ],
        correct: 'Well ahead, around 10-15 seconds in front',
        distractors: [
          'Only at the vehicle directly ahead',
          'Mostly at mirrors and dashboard',
          'Just beyond your hood'
        ]
      },
      {
        concept: 'stale green light',
        rule: 'Cover the brake and be ready to stop when approaching a signal that has been green for a while.',
        prompts: [
          'You approach a light that has been green for a long time. What is a defensive choice?',
          'At a likely-changing signal, how should you prepare?',
          'A stale green light should make you:'
        ],
        correct: 'Ease off speed and be ready to stop',
        distractors: [
          'Accelerate to clear before yellow',
          'Maintain speed because green guarantees passage',
          'Change lanes suddenly to pass queued cars'
        ]
      },
      {
        concept: 'night driving glare',
        rule: 'At night, reduce glare by looking slightly to the right edge and avoiding direct stare at headlights.',
        prompts: [
          'An oncoming vehicle’s bright headlights cause glare. What should you do?',
          'How can you reduce nighttime headlight glare?',
          'When temporarily blinded by oncoming lights, the safest visual target is:'
        ],
        correct: 'Look toward the right edge of your lane and slow as needed',
        distractors: [
          'Look directly at the oncoming lights to adapt faster',
          'Close one eye and keep speed',
          'Turn on interior lights for contrast'
        ]
      },
      {
        concept: 'skid response',
        rule: 'If your vehicle skids, ease off accelerator, avoid hard braking, and steer in the direction you want to go.',
        prompts: [
          'Your car starts to skid on a slick road. What is the best response?',
          'If traction is lost and the vehicle slides, you should:',
          'During a skid, the steering correction should be:'
        ],
        correct: 'Ease off and steer toward your intended path',
        distractors: [
          'Brake hard and turn opposite quickly',
          'Accelerate to regain traction',
          'Lock the steering wheel straight'
        ]
      },
      {
        concept: 'construction zone hazards',
        rule: 'Work zones require reduced speed, extra space, and strict attention to signs and workers.',
        prompts: [
          'You enter a construction zone with narrowed lanes. What should you do?',
          'In work areas, a defensive driver should:',
          'Road work signs and cones indicate you should:'
        ],
        correct: 'Slow down, increase space, and follow temporary controls',
        distractors: [
          'Maintain speed to avoid blocking traffic',
          'Follow closely so others cannot merge ahead',
          'Ignore cones if your lane appears open'
        ]
      }
    ]
  },
  LicensingRulesAndSafety: {
    ref: 'Licensing rules and safety requirements',
    concepts: [
      {
        concept: 'seat belt requirement',
        rule: 'Drivers and passengers must wear seat belts; child restraints must be used correctly.',
        prompts: [
          'Before moving your vehicle, what safety check is required for seat belts?',
          'A front passenger says belts are optional on short trips. What is correct?',
          'What is true about seat belt use in California?'
        ],
        correct: 'Everyone should be properly restrained before driving',
        distractors: [
          'Only the driver must wear a belt',
          'Belts are optional below 25 mph',
          'Passengers can remove belts in city traffic'
        ]
      },
      {
        concept: 'license possession',
        rule: 'Drivers must carry a valid license while operating a motor vehicle.',
        prompts: [
          'When driving, you are required to have what document with you?',
          'A valid California license should be:',
          'If an officer requests identification while you drive, you must provide:'
        ],
        correct: 'A valid driver license',
        distractors: [
          'Only vehicle registration',
          'A photo of your license on your phone only',
          'Proof of insurance only'
        ]
      },
      {
        concept: 'insurance proof',
        rule: 'Drivers must carry proof of financial responsibility (such as insurance) when operating a vehicle.',
        prompts: [
          'What must you be able to show regarding financial responsibility when driving?',
          'If stopped by law enforcement, which vehicle-related proof is typically required?',
          'Operating a vehicle legally includes carrying:'
        ],
        correct: 'Proof of financial responsibility',
        distractors: [
          'Only maintenance records',
          'A recent fuel receipt',
          'A written route plan'
        ]
      },
      {
        concept: 'headlight use',
        rule: 'Use headlights from sunset to sunrise and in poor visibility conditions.',
        prompts: [
          'At dusk and low visibility, what lighting rule applies?',
          'When should headlights be turned on?',
          'Rain reduces visibility in daytime. What should drivers do about headlights?'
        ],
        correct: 'Turn on headlights for visibility and legal compliance',
        distractors: [
          'Use parking lights only',
          'Use high beams in all traffic',
          'Keep lights off to reduce glare'
        ]
      },
      {
        concept: 'stopped for enforcement',
        rule: 'If stopped by police, pull over safely, stay calm, and follow lawful instructions.',
        prompts: [
          'An officer signals you to pull over. What is the proper response?',
          'When being stopped by law enforcement, your first step is to:',
          'A traffic stop is initiated behind you. What should you do?'
        ],
        correct: 'Pull over safely at the right and follow instructions',
        distractors: [
          'Continue until home if it is close',
          'Stop immediately in the travel lane',
          'Exit the vehicle quickly and approach the patrol car'
        ]
      }
    ]
  }
};

const categoryNames = Object.keys(categories);
const QUESTIONS_PER_CATEGORY = 60;
const DIFFICULTY_COUNTS = { easy: 15, medium: 30, hard: 15 };

const environmentByDifficulty = {
  easy: [
    'On a clear afternoon in light traffic,',
    'During a routine daytime drive with dry pavement,',
    'In a quiet neighborhood with clear lane markings,',
    'On a familiar route with stable traffic flow,'
  ],
  medium: [
    'At dusk with moderate traffic and frequent lane changes,',
    'In a busy commercial corridor with variable speeds,',
    'In light rain while visibility is reduced and traffic is steady,',
    'Near a major intersection with mixed vehicle movement,'
  ],
  hard: [
    'At night in heavy traffic with wet pavement and short gaps,',
    'In stop-and-go freeway flow during rain and low visibility,',
    'Near a complex intersection where visibility is partly blocked,',
    'During dense traffic with multiple simultaneous hazards,'
  ]
};

const decisionPromptByDifficulty = {
  easy: [
    'Which action best follows the rule and keeps everyone safe?',
    'What is the best legal next step?',
    'Which choice is safest and most correct?'
  ],
  medium: [
    'What is the best action after considering right-of-way and space?',
    'Which choice best balances legal priority and safety margin?',
    'What should you do first to reduce conflict risk?'
  ],
  hard: [
    'Which option is the best action given all risks in this moment?',
    'What is the safest legal move when several hazards overlap?',
    'Which response best manages both immediate and downstream risk?'
  ]
};

const categoryComplications = {
  RightOfWay: [
    'a pedestrian is waiting at the corner and another driver inches forward, and',
    'an oncoming vehicle signals late while cross traffic approaches, and',
    'you and another vehicle arrive within a second of each other, and'
  ],
  SignsSignalsMarkings: [
    'lane markings change just before the intersection, and',
    'drivers around you react differently to a control signal, and',
    'a crosswalk and stop line both affect your position, and'
  ],
  SpeedAndFollowingDistance: [
    'traction is reduced and vehicles ahead brake unpredictably, and',
    'your sight distance shortens near a curve and traffic compresses, and',
    'a tailgater behind you reduces your margin for error, and'
  ],
  LaneUseAndTurns: [
    'two adjacent lanes are moving at different speeds, and',
    'a turn lane begins while vehicles are already merging, and',
    'your intended path crosses both turning and through traffic, and'
  ],
  Parking: [
    'curb markings and grade both affect legality and safety, and',
    'you must choose a legal spot without blocking access points, and',
    'space is limited and rollback risk is present, and'
  ],
  FreewayDriving: [
    'ramp traffic and mainline traffic are moving at different speeds, and',
    'a short merge area forces early gap decisions, and',
    'nearby drivers are braking and changing lanes frequently, and'
  ],
  SharingTheRoad: [
    'vulnerable road users are nearby and spacing is tight, and',
    'a large vehicle limits your visibility to one side, and',
    'a turning conflict with a cyclist or pedestrian is developing, and'
  ],
  DistractedImpairedDriving: [
    'attention demands increase while alerts and notifications occur, and',
    'fatigue signs appear as traffic complexity rises, and',
    'reaction-time risk is elevated by impairment factors, and'
  ],
  HazardsAndDefensiveDriving: [
    'multiple potential hazards are forming ahead, and',
    'you have limited escape space on both sides, and',
    'conditions change quickly between intersections, and'
  ],
  LicensingRulesAndSafety: [
    'legal compliance and immediate safety steps both matter, and',
    'an enforcement or visibility condition changes your obligations, and',
    'passenger safety and documentation requirements both apply, and'
  ]
};

const genericDistractorsByDifficulty = {
  easy: [
    'Continue as planned because conditions still look manageable',
    'Rely on other drivers to yield once they see your vehicle',
    'Choose the faster option to clear the area sooner'
  ],
  medium: [
    'Proceed slowly without fully yielding because you are already committed',
    'Take the first available gap even if spacing is tight',
    'Hold your current speed and wait for others to adjust around you'
  ],
  hard: [
    'Make a quick aggressive move to avoid being boxed in',
    'Prioritize keeping traffic flow moving over strict right-of-way',
    'Delay the decision until the last moment and then accelerate through'
  ]
};

const categoryDistractorPool = {
  RightOfWay: [
    'Proceed first because you signaled early',
    'Enter halfway and rely on others to stop',
    'Wave another driver through, then follow immediately'
  ],
  SignsSignalsMarkings: [
    'Treat the control as advisory when traffic is light',
    'Use your signal to override the lane marking requirement',
    'Roll through the control point to improve your view first'
  ],
  SpeedAndFollowingDistance: [
    'Keep your speed and just tap brakes if needed',
    'Shorten your gap so other vehicles cannot merge ahead',
    'Match the fastest nearby car to reduce conflict time'
  ],
  LaneUseAndTurns: [
    'Drift into position gradually without full mirror checks',
    'Start the turn wide and sort lane position afterward',
    'Signal briefly and move as soon as one mirror looks clear'
  ],
  Parking: [
    'Park quickly if you remain inside the vehicle',
    'Use hazard lights to park temporarily where signs restrict stopping',
    'Choose the closest spot even if curb or slope rules conflict'
  ],
  FreewayDriving: [
    'Stop at the ramp end and wait for all lanes to clear',
    'Merge below traffic speed and let others brake around you',
    'Stay in the passing lane after overtaking to avoid extra lane changes'
  ],
  SharingTheRoad: [
    'Pass closely so you can minimize time beside them',
    'Assume smaller vehicles will move aside if you signal',
    'Hold position in a blind spot until traffic opens up'
  ],
  DistractedImpairedDriving: [
    'Handle the distraction quickly while keeping one hand on the wheel',
    'Continue driving because you still feel in control',
    'Compensate by driving faster to finish the trip sooner'
  ],
  HazardsAndDefensiveDriving: [
    'Commit to your speed and avoid adjustments that confuse others',
    'Focus only on the vehicle directly in front of you',
    'Wait until the hazard is immediate before reacting'
  ],
  LicensingRulesAndSafety: [
    'Assume compliance can be handled after you reach your destination',
    'Treat safety equipment as optional for short trips',
    'Proceed first and handle officer instructions when convenient'
  ]
};

function rotate(arr, shift) {
  const n = arr.length;
  return arr.map((_, i) => arr[(i + shift) % n]);
}

function unique(arr) {
  return Array.from(new Set(arr));
}

function buildChoices(correct, distractors, seed) {
  const eligibleDistractors = unique(distractors.filter((d) => d !== correct));
  const baseDistractors = rotate(eligibleDistractors, seed % eligibleDistractors.length).slice(0, 3);
  const base = [correct, ...baseDistractors];
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = (seed + i * 7) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const choices = order.map((idx) => base[idx]);
  const answerIndex = choices.indexOf(correct);
  return { choices, answerIndex };
}

function difficultyByVariant(index) {
  if (index < DIFFICULTY_COUNTS.easy) return 'easy';
  if (index < DIFFICULTY_COUNTS.easy + DIFFICULTY_COUNTS.medium) return 'medium';
  return 'hard';
}

function composeScenarioPrefix(category, difficulty, seed) {
  const environment = environmentByDifficulty[difficulty][seed % environmentByDifficulty[difficulty].length];
  const complication = categoryComplications[category][seed % categoryComplications[category].length];
  return `${environment} ${complication}`;
}

const questions = [];
let idCounter = 1;

for (const category of categoryNames) {
  const data = categories[category];
  for (let variant = 0; variant < QUESTIONS_PER_CATEGORY; variant += 1) {
    const difficulty = difficultyByVariant(variant);
    const concept = data.concepts[variant % data.concepts.length];
    const prompt = concept.prompts[variant % concept.prompts.length];
    const decisionPrompt = decisionPromptByDifficulty[difficulty][variant % decisionPromptByDifficulty[difficulty].length];
    const scenarioPrefix = composeScenarioPrefix(category, difficulty, variant + concept.prompts.length);
    const promptWithoutQ = prompt.replace(/\?+$/, '');
    const fullQuestion = `${scenarioPrefix} ${promptWithoutQ}? ${decisionPrompt}`;
    const distractors = [
      ...concept.distractors,
      ...genericDistractorsByDifficulty[difficulty],
      ...categoryDistractorPool[category]
    ];
    const { choices, answerIndex } = buildChoices(concept.correct, distractors, variant + category.length);

    questions.push({
      id: `CA-${String(idCounter).padStart(4, '0')}`,
      question: fullQuestion,
      choices,
      answerIndex,
      category,
      difficulty,
      rationale: `${concept.rule} The best answer is the choice that preserves space, follows legal priority, and avoids creating a sudden conflict for others.`,
      handbookRef: data.ref
    });

    idCounter += 1;
  }
}

const outputPath = path.join(process.cwd(), 'src/data/questions.generated.json');
fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
console.log(`Generated ${questions.length} questions at ${outputPath}`);
