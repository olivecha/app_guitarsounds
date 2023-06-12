import time, os
from inspect import getdoc
import streamlit as st
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
from src.sound import sound
import librosa
from guitarsounds.utils import load_wav
from guitarsounds.analysis import Sound, Plot
from app_utils import get_file_number, get_cached_next_number
from app_utils import remove_cached_sound, create_figure
from app_utils import generate_report
import defined_analyses

#""" 
#Session setup
#"""

# Clear the old figures on start
if 'cleared_figures' not in st.session_state:
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

# Functions modifying the session state 
# Need to be defined in this file

def update_file_load_status():
    """ function for upload button call_back """
    st.session_state['upload_status'] = True

def set_state(menu, analysis, state):
    """ set the session state of a menu to organise outputs """
    st.session_state[menu][analysis] = state 

def generate_figure_and_set_state(analysis_call, key, sound):
    create_figure(analysis_call, key, sound) 
    set_state('analysis_menu', key, 'figure')

# Global application setup
title = "Guitarsound: analyse comparative de sons de guitare"
st.title(title)
sounds_io, analysis, help = st.tabs(["Ajouter des sons", 
                                     "Analyser des sons",
                                     "Aide"])

# First tab (Input / Output)
with sounds_io: 
    col1, col2 = st.columns([1, 1])
    col1.write('')
    col2.write('')

    expander1 = col1.expander("Enregistrer un son")
    record_button = expander1.button('Enregistrer un son',
                                use_container_width=True)
    record_duration = expander1.number_input("Temps d'enregistrement (secondes)",
                                             value=3,
                                             min_value=1,
                                             max_value=4)
    if record_button:
        with st.spinner(f'Enregistrement durant {record_duration} secondes ....'):
            sound.record(record_duration)
        new_sound = Sound('temp.wav')
        sound_number = get_cached_next_number(st.session_state)
        st.session_state['sounds_cache'][sound_number] = new_sound
    
    expander = col2.expander("Téléverser un son")
    uploaded_file = expander.file_uploader("Choose a file", 
                                           on_change=update_file_load_status,
                                           label_visibility='collapsed')
    
    if uploaded_file is not None and st.session_state['upload_status']:
        sigarray, sr = librosa.load(uploaded_file)
        new_sound = Sound((sigarray, sr))
        sound_number = get_cached_next_number(st.session_state)
        st.session_state['sounds_cache'][sound_number] = new_sound
        st.session_state['upload_status'] = False
    
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
        col5.write(' ')

        name = col3.text_input(f'name_{sound_number}', 
                               'Nom du son', 
                               label_visibility='collapsed')
        names.append(name)
        col4.audio(sound.signal.signal, sample_rate=sound.signal.sr)
        col5.download_button(label=':arrow_down:',
                             data=sound.file_bytes,
                             file_name=f'{name}.wav',)
# Analysis Tab
with analysis:
    # columns to format the output
    colbut, colhelp, colcheck = st.columns([3.5, 0.5, 1.0])
    colbut.write('Analyse')
    colhelp.write('Aide')
    colcheck.write('Rapport')
    # If there are analyses we can do (sounds were uploaded)
    sound_cache = st.session_state['sounds_cache']
    sounds_list = [sound_cache[name] for name in sound_cache]

    if len(sounds_list) == 1:
        analysis_names = defined_analyses.single_sound_analysis_names
        analysis_functions = defined_analyses.single_sound_analysis_functions
        analysis_helps = defined_analyses.single_sound_analysis_help

        if 'analysis_menu' not in st.session_state:
            st.session_state['analysis_menu'] = {name:None for name in analysis_names}
            st.session_state['report_analyses'] = {name:False for name in analysis_names}
            st.session_state['cached_images'] = {name:None for name in analysis_names}

        for analysis in analysis_names:
            colbut, colhelp, colcheck = st.columns([3.5, 0.5, 1.0])

            colbut.button(label=analysis_names[analysis],
                          on_click=generate_figure_and_set_state,
                          use_container_width=True,
                          args=(analysis_functions[analysis], analysis, sounds_list[0]))

            colhelp.button(label=':question:',
                           key=analysis,
                           on_click=set_state,
                           args=('analysis_menu', analysis, 'help'))

            check = colcheck.checkbox(label=analysis,
                                      label_visibility='collapsed')

            st.session_state['report_analyses'][analysis] = check

            if st.session_state['analysis_menu'][analysis] == 'figure':
                if st.session_state['cached_images'][analysis] is None:
                    filename = '.'.join([analysis, 'png'])
                    image = Image.open(os.path.join('figure_cache', filename))
                    st.session_state['cached_images'][analysis] = image
                image = st.session_state['cached_images'][analysis]
                st.empty().image(image)

            elif st.session_state['analysis_menu'][analysis] == 'help':
                helpstr = analysis_helps[analysis]
                st.empty().markdown(helpstr)

        colrep, coldown = st.columns(2)

        if colrep.button(label='Générer un rapport',
                         on_click=generate_report,
                         args=(st.session_state['report_analyses'],)):

            coldown.download_button(label='Télécharger le rapport',
                                    data=open('report.docx', 'rb').read(),
                                    file_name='report.docx')

    else:
        st.write('Veuillez sélectioner un son')

with help:
    with open(os.path.join('documentation', 'documentation.md')) as md_file:
        md_string = md_file.read()
    st.markdown(md_string)
    

