const fs = require('fs');
const csv = require('csv-parser');
const make_stimuli = require('./make_stimuli')
const make_practice = require('./make_practice_stimuli')
const make_folder = require('./make_folder')
const split_stimuli_to_blocks = require('./split_stimuli_to_blocks')
const make_block_csv = require('./make_block_csv')
const make_audio = require('./make_audio')
const EDO = require("edo.js").EDO
const edo = new EDO(12)

/**Set Settings here*/
async function gen_task_set (sub_id,prefix="CON",root='./task_sets') {
    const sub_name = prefix + "0".repeat(4-String(sub_id).length) + String(sub_id)

    make_folder(root,"/" + sub_name)
    make_folder(root + "/" + sub_name,["/audio","/csv"])

    const stimuli1 = make_stimuli(sub_name) //the function makes 84 questions (which is every possible permutation)
    const stimuli2 = make_stimuli(sub_name)

    const practice_stimuli = make_practice(sub_name)
        .map((stimulus,Q_num)=>{
            stimulus.Q_num = "P" + (Q_num+1)
            stimulus.probe_file = "P-" +(Q_num+1)+ "-000-probe.mp3"
            stimulus.test_file = "P-" +(Q_num+1)+ "-001-test.mp3"
            return stimulus
        })

    const stimuli = [].concat(stimuli1).concat(stimuli2) //no need to shuffle because the stimuli is shuffled in the creation process
            .map((stimulus,Q_num)=>{
                stimulus.Q_num = Q_num+1
                stimulus.probe_file = "Q-" +(Q_num+1)+ "-000-probe.mp3"
                stimulus.test_file = "Q-" +(Q_num+1)+ "-001-test.mp3"
                return stimulus
            }).slice(0,120) //Only keep 120 trials

    const blocks = [practice_stimuli,...split_stimuli_to_blocks(stimuli,10)]
    const process_block_audio = function (block) {
        const audio_dir = root+"/" + sub_name +"/audio/"
        let mp3 = []
        block.forEach((stimulus,Q_num)=>{
            mp3.push(make_audio(stimulus.probe,audio_dir + stimulus.probe_file),make_audio([stimulus.test],audio_dir + stimulus.test_file))
        })
        return Promise.all(mp3)

    }
    async function process_block  (block_num=0) {
            if(block_num<blocks.length) {
                console.log(sub_name,"processing block " + (block_num))
                let block = blocks[block_num]
                make_block_csv(sub_name,root+"/" + sub_name +"/",block_num,block)
                await process_block_audio(block)
                console.log("created block " + parseInt(block_num) +" audio")
                await process_block(block_num+1)
            }
    }

    await process_block(0).then(function () {
        console.log("finished", sub_name)
    })
    return sub_name
}


module.exports = gen_task_set



