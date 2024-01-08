import time, os
from inspect import getdoc
from tempfile import NamedTemporaryFile
import streamlit as st
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import soundfile as sf
import librosa
from pydub import AudioSegment
from audiorecorder import audiorecorder
from guitarsounds.utils import load_wav
from guitarsounds.analysis import Sound, Plot, SoundPack
from app_utils import get_file_number, get_cached_next_number
from app_utils import remove_cached_sound, create_figure
from app_utils import generate_report
import defined_analyses

#""" 
#Session setup
#"""

# Clear the old figures on start
if 'cleared_figures' not in st.session_state:
    if 'figure_cache' not in os.listdir():
        os.mkdir('figure_cache')
    for f in os.listdir('figure_cache'):
        os.remove(os.path.join('figure_cache', f))
    st.session_state['cleared_figures'] = True

# Flag to not upload the sound for every run
if 'upload_status' not in st.session_state:
    st.session_state['upload_status'] = None

# Cache containing all the loaded sounds
if 'sounds_cache' not in st.session_state:
    st.session_state['sounds_cache'] = {}

# Flag for the analysis output
if 'analysis_output' not in st.session_state:
    st.session_state['analysis_output'] = {}

if 'reference_recording' not in st.session_state:
    st.session_state['reference_recording'] = ''

if 'cached_logo' not in st.session_state:
    image = Image.open('documentation/figures/logo.png')
    st.session_state['cached_logo'] = image


# Functions modifying the session state 
# Need to be defined in this file
def update_file_load_status():
    """ function for upload button call_back """
    st.session_state['upload_status'] = True

def reset_analyses(analysis_names):
    st.session_state['analysis_menu'] = {name:None for name in analysis_names}
    st.session_state['report_analyses'] = {name:False for name in analysis_names}
    st.session_state['cached_images'] = {name:None for name in analysis_names}

def set_state(menu, analysis, state):
    """ set the session state of a menu to organise outputs """
    st.session_state[menu][analysis] = state 

def generate_figure_and_set_state(analysis_call, key, sound):
    """
    Function to alter the session state depending on the analysis call
    """
    # Case for the listen frequency bins function
    if key == 'listenband':
        set_state('analysis_menu', key, 'listen')
    # Case for interactive analyses
    elif key in ['signal', 'envelope', 'logenv', 'fft']:
        set_state('analysis_menu', key, 'call')
    # Default
    else:
        create_figure(analysis_call, key, sound) 
        set_state('analysis_menu', key, 'figure')

# Title and logo
title = "Analyse comparative de sons de guitare"
col_logo, col_title = st.columns([1, 2])
with col_title:
    st.title(title)
with col_logo:
    st.write('')
    st.write('')
    st.image(st.session_state['cached_logo'], use_column_width='always')

sounds_io, analysis, help_tab, about = st.tabs(["Ajouter des sons", 
                                                "Analyser/Comparer des sons",
                                                "Aide",
                                                "À Propos"])

# First tab (Input / Output)
with sounds_io: 
    col1, col2 = st.columns([1, 1])
    col1.write('')
    col2.write('')

    # Audio recording sound loading
    expander1 = col1.expander("Enregistrer un son")
    with expander1:
        now = time.time()
        audio = audiorecorder("Cliquez pour débuter l'enregistrement", "Stop")
        recording_time  = time.time() - now

    if (st.session_state['reference_recording'] != audio.raw_data) and (len(audio) > 0):
        f = audio.export(format="wav")
        sigarray, sr = librosa.load(f.name, sr=None)
        new_sound = Sound((sigarray, sr))
        sound_number = get_cached_next_number(st.session_state)
        st.session_state['sounds_cache'][sound_number] = new_sound
        st.session_state['reference_recording'] = audio.raw_data
        st.warning("Les sons enregistrés ne sont pas sauvegardés d'une session à l'autre \n vous pouvez les télécharger si vous voulez les conserver", icon="⚠️")
    
    # File uploading
    expander = col2.expander("Téléverser un son")
    uploaded_file = expander.file_uploader("Choose a file", 
                                           on_change=update_file_load_status,
                                           label_visibility='collapsed')
    
    if uploaded_file is not None and st.session_state['upload_status']:
        if uploaded_file.name.split('.')[-1] == 'm4a':
            if 'temp.wav' in os.listdir():
                os.remove('temp.wav')
            _ = AudioSegment.from_file(uploaded_file, 'm4a').split_to_mono()[0].export('temp.wav', format='wav')
            new_sound = Sound('temp.wav')
        else:
            sigarray, sr = sf.read(uploaded_file)
            new_sound = Sound((sigarray, sr))
        sound_number = get_cached_next_number(st.session_state)
        st.session_state['sounds_cache'][sound_number] = new_sound
        st.session_state['upload_status'] = False
    
    # Display the list of loaded sounds
    col3, col4, col5, colx = st.columns([2, 2.5, 0.5, 0.5])
    names = []
    for sound_number in st.session_state['sounds_cache']:
        sound = st.session_state['sounds_cache'][sound_number]
        colx.write(' ')
        colx.button(label=':wastebasket:', 
                    key=f'del_{sound_number}',
                    on_click=remove_cached_sound,
                    args=(st.session_state, sound_number))
        col3.write(' ')
        col4.write(' ')
        name = col3.text_input(f'name_{sound_number}', 
                               'Nom du son', 
                               label_visibility='collapsed')
        names.append(name)
        col4.audio(sound.signal.signal, sample_rate=sound.signal.sr)
        col5.write(' ')

        if name != 'Nom du son':
            download_name = f"{name}.wav"
        else:
            download_name = f"Son_{sound_number}.wav"

        col5.download_button(label=':arrow_down:',
                             data=sound.file_bytes,
                             key=f"download_{sound_number}",
                             file_name=f'{name}.wav',)

    # If more than one sound create soundpack item
    if len(st.session_state['sounds_cache']) > 1:
        st.session_state['soundpack'] = None

# Analysis Tab
with analysis:
    # Define the number of sounds item
    if 'number_of_sounds' not in st.session_state:
        st.session_state['number_of_sounds'] = 0
    if 'current_sounds' not in st.session_state:
        st.session_state['current_sounds'] = [np.zeros(10)]
    # columns to format the output
    colbut, colhelp, colcheck = st.columns([3.5, 0.5, 1.0])
    # Get the dictionnary containing all the uploaded sounds
    sound_cache = st.session_state['sounds_cache']
    # Get all the sounds in a list
    sounds_list = [sound_cache[name] for name in sound_cache]
    # if the soundpack key exists, define a soundpack
    if 'soundpack' in st.session_state:
        if st.session_state['soundpack'] is None:
            st.session_state['soundpack'] = SoundPack(sounds_list, names=names)

    if len(sounds_list) > 0:
        # Write the headers
        colbut.write('Analyse')
        colhelp.write('Aide')
        colcheck.write('Rapport')

        # Load the analyses when looking only at a single sound
        if len(sounds_list) == 1:
            # {analysis keys: name strings}
            analysis_names = defined_analyses.single_sound_analysis_names
            # {analysis keys: callables on the sounds}
            analysis_functions = defined_analyses.single_sound_analysis_functions
            # {analysis keys: loaded markdown help file}
            analysis_helps = defined_analyses.single_sound_analysis_help
            # {analysis keys: loaded help figure}
            analysis_figures = defined_analyses.single_sound_analysis_help_figures

        # Load the analyses to compare two sounds
        elif len(sounds_list) == 2:
            analysis_names = defined_analyses.dual_sound_analysis_names
            analysis_functions = defined_analyses.dual_sound_analysis_functions
            analysis_helps = defined_analyses.dual_sound_analysis_help
            analysis_figures = defined_analyses.dual_sound_analysis_help_figures

        # Load the analyses to compare an arbitrary amount of sounds
        elif len(sounds_list) > 2:
            analysis_names = defined_analyses.multi_sound_analysis_names
            analysis_functions = defined_analyses.multi_sound_analysis_functions
            analysis_helps = defined_analyses.multi_sound_analysis_help
            analysis_figures = defined_analyses.multi_sound_analysis_help_figures

        # Session state data for the analyses
        # Define the analysis menu in the session state
        if 'analysis_menu' not in st.session_state:
            # Only occurs when the first sound is loaded
            reset_analyses(analysis_names)
            st.session_state['number_of_sounds'] = len(sounds_list)

        # Update if the number of sounds has changed
        elif len(sounds_list) != st.session_state['number_of_sounds']:
            print(f'The number of sounds changed from {st.session_state["number_of_sounds"]} to {len(sounds_list)}')
            reset_analyses(analysis_names)
            # Update the stored number of sounds
            st.session_state['number_of_sounds'] = len(st.session_state['sounds_cache'])

        # Update if the number of sounds is the same but they changed
        else:
            sounds_were_changed = False
            new_signals = [sound.signal.signal for sound in sounds_list]
            for previous_signal, new_signal in zip(st.session_state['current_sounds'], new_signals):
                if len(previous_signal) != len(new_signal):
                    sounds_were_changed = True
                    break
                elif (previous_signal != new_signal).any():
                    sounds_were_changed = True
                    break
            if sounds_were_changed:
                print('The number of sounds is the same but they changed so the analyses were restarted')
                reset_analyses(analysis_names)
                st.session_state['current_sounds'] = [s.signal.signal for s in sounds_list]

        for analysis in analysis_names:
            colbut, colhelp, colcheck = st.columns([3.5, 0.5, 1.0])

            if len(sounds_list) == 1:
                colbut.button(label=analysis_names[analysis],
                              on_click=generate_figure_and_set_state,
                              use_container_width=True,
                              args=(analysis_functions[analysis], 
                                    analysis, 
                                    sounds_list[0]))
            else:
                pack = st.session_state['soundpack']
                colbut.button(label=analysis_names[analysis],
                              on_click=generate_figure_and_set_state,
                              use_container_width=True,
                              args=(analysis_functions[analysis], 
                                    analysis, 
                                    pack))


            colhelp.button(label=':question:',
                           key=analysis,
                           on_click=set_state,
                           args=('analysis_menu', analysis, 'help'))

            if analysis != 'listenband':
                show_check = True
                check_value = False
                if st.session_state['analysis_menu'][analysis] in ('figure', 'call'):
                    check_value = True
                else:
                    show_check = False

                if show_check:
                    check = colcheck.checkbox(label=analysis,
                                              value=check_value, 
                                              label_visibility='collapsed')
                    st.session_state['report_analyses'][analysis] = check
                else:
                    colcheck.write('')
                    st.session_state['report_analyses'][analysis] = False
                    
            else:
                colcheck.write('')
                st.session_state['report_analyses'][analysis] = False

            if st.session_state['analysis_menu'][analysis] == 'figure':
                if st.session_state['cached_images'][analysis] is None:
                    filename = '.'.join([analysis, 'png'])
                    image = Image.open(os.path.join('figure_cache', filename))
                    st.session_state['cached_images'][analysis] = image
                image = st.session_state['cached_images'][analysis]
                st.empty().image(image)

            elif st.session_state['analysis_menu'][analysis] == 'call':
                analysis_functions[analysis](sounds_list[0])
                filename = '.'.join([analysis, 'png'])
                image = Image.open(os.path.join('figure_cache', filename))
                st.session_state['cached_images'][analysis] = image
                image = st.session_state['cached_images'][analysis]
                st.empty().image(image)
            
            elif st.session_state['analysis_menu'][analysis] == 'listen':
                analysis_functions[analysis](sounds_list[0])

            elif st.session_state['analysis_menu'][analysis] == 'help':
                helpstr = analysis_helps[analysis]
                st.empty().markdown(helpstr)
                st.empty().image(analysis_figures[analysis], use_column_width=True)

        colrestart, colrep, coldown = st.columns(3)

        colrestart.button(label='Réinitialiser les analyses',
                          on_click=reset_analyses,
                          args=(analysis_names, ))

        if colrep.button(label='Générer un rapport',
                         on_click=generate_report,
                         args=(st.session_state['report_analyses'],)):

            coldown.download_button(label='Télécharger le rapport',
                                    data=open('report.docx', 'rb').read(),
                                    file_name='report.docx')

    else:
        try:
            _ = analysis_names
        except:
            analysis_names = defined_analyses.single_sound_analysis_names
        reset_analyses(analysis_names)
        st.write('Veuillez sélectioner un son')

with help_tab:
    with open(os.path.join('documentation', 'documentation.md')) as md_file:
        md_string = md_file.read()
    st.markdown(md_string)

with about:
    with open(os.path.join('documentation', 'about.md')) as abt_file:
        md_string = abt_file.read()
    st.markdown(md_string)
    

